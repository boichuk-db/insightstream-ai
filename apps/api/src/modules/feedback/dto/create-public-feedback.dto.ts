import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePublicFeedbackDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
