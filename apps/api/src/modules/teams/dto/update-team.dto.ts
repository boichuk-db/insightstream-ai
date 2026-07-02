import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
