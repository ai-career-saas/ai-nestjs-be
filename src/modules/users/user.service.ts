import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE, DrizzleDB } from "src/database.module";
import { eq } from "drizzle-orm";
import { users } from "src/database/schema";
import { UpdateUserDto } from "./dto/request/UpdateUser.dto";

// Only the settings-relevant columns — never select passwordHash here.
const SETTINGS_COLUMNS = {
  name: users.name,
  email: users.email,
  locale: users.locale,
  timezone: users.timezone,
  notifyEmail: users.notifyEmail,
  notifyProduct: users.notifyProduct,
  notifyUsageAlerts: users.notifyUsageAlerts,
};

@Injectable()
export class UserService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async getProfile(userId: string) {
    const [row] = await this.db
      .select(SETTINGS_COLUMNS)
      .from(users)
      .where(eq(users.id, userId));

    if (!row) throw new NotFoundException("User not found");
    return row;
  }

  async update(userId: string, dto: UpdateUserDto) {
    const [updated] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning(SETTINGS_COLUMNS);

    if (!updated) throw new NotFoundException("User not found");

    return updated;
  }
}
