import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTopicDto {

    @IsString()
    @IsNotEmpty()
    topic: string;

    @IsString()
    @IsOptional()
    topicCode?: string;

    @IsString()
    @IsNotEmpty()
    description: string;
}
