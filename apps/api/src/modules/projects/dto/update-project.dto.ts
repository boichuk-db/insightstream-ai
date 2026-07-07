import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HOSTNAME_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(HOSTNAME_PATTERN, {
    message: 'domain must be a valid hostname (no protocol or path)',
  })
  domain?: string;
}
