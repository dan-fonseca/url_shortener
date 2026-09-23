import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

export interface Link {
  code: string;
  url: string;
  createdAt: string;
  clicks: number;
  /** Epoch seconds. Also the table's TTL attribute, so DynamoDB purges expired items for free. */
  expiresAt?: number;
  lastClickedAt?: string;
  custom: boolean;
}

// Created once per execution environment and reused across warm invocations.
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error('TABLE_NAME environment variable is not set');
  return name;
}

const nowEpochSeconds = (now: Date) => Math.floor(now.getTime() / 1000);

/**
 * Inserts a link only if the code is unused. Returns false on collision
 * instead of throwing, so callers can retry with a new code or report 409.
 */
export async function putLinkIfAbsent(link: Link): Promise<boolean> {
  try {
    await client.send(
      new PutCommand({
        TableName: tableName(),
        Item: link,
        ConditionExpression: 'attribute_not_exists(code)',
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

/**
 * Resolves a code for redirect and counts the click in one atomic round trip:
 * the condition rejects missing or expired links (TTL deletion is lazy, so
 * expiry must be enforced at read time too), and ReturnValues hands back the
 * destination URL without a separate read.
 */
export async function resolveAndCountClick(code: string, now = new Date()): Promise<string | null> {
  try {
    const result = await client.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { code },
        UpdateExpression: 'ADD clicks :one SET lastClickedAt = :now',
        ConditionExpression:
          'attribute_exists(code) AND (attribute_not_exists(expiresAt) OR expiresAt > :nowEpoch)',
        ExpressionAttributeValues: {
          ':one': 1,
          ':now': now.toISOString(),
          ':nowEpoch': nowEpochSeconds(now),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return (result.Attributes?.url as string | undefined) ?? null;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return null;
    throw err;
  }
}

/** Reads link metadata for the stats endpoint; expired links are treated as missing. */
export async function getLink(code: string, now = new Date()): Promise<Link | null> {
  const result = await client.send(new GetCommand({ TableName: tableName(), Key: { code } }));
  const link = result.Item as Link | undefined;
  if (!link) return null;
  if (link.expiresAt !== undefined && link.expiresAt <= nowEpochSeconds(now)) return null;
  return link;
}
