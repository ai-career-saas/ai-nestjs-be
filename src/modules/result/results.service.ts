import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE, DrizzleDB } from "../../database.module";
import { agentResults, agentTypeEnum } from "../../database/schema";
import { eq, and } from "drizzle-orm";

export type AgentType = (typeof agentTypeEnum.enumValues)[number];

@Injectable()
export class ResultsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async saveResult(userId: string, agentType: AgentType, result: unknown, metadata?: unknown) {
    return this.db
      .insert(agentResults)
      .values({ userId, agentType, result, metadata, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [agentResults.userId, agentResults.agentType],
        set: { result, metadata, updatedAt: new Date() },
      });
  }

  async listResults(userId: string) {
    return this.db
      .select()
      .from(agentResults)
      .where(eq(agentResults.userId, userId))
      .orderBy(agentResults.updatedAt);
  }

  async getResult(userId: string, agentType: AgentType) {
    const [row] = await this.db
      .select()
      .from(agentResults)
      .where(and(eq(agentResults.userId, userId), eq(agentResults.agentType, agentType)))
      .limit(1);

    if (!row) throw new NotFoundException(`No saved result for ${agentType}`);
    return row;
  }

  async deleteResult(userId: string, agentType: AgentType) {
    await this.db
      .delete(agentResults)
      .where(and(eq(agentResults.userId, userId), eq(agentResults.agentType, agentType)));
  }
}
