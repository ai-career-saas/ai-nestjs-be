import { ApiProperty } from "@nestjs/swagger";

export class SkillUpgradeRequestDto {
  @ApiProperty({
    type: String,
    description:
      "The title of the career for which the skill upgrade plan is requested.",
    example: "Software Engineer",
  })
  careerTitle: string;
}
