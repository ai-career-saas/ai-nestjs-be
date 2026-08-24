import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SkillUpgradeRequestDto {
  @ApiProperty({
    type: String,
    description:
      "The title of the career for which the skill upgrade plan is requested.",
    example: "Software Engineer",
  })
  @IsString()
  careerTitle: string;
}
