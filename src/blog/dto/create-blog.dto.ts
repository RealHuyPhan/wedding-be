import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBlogDto {
    @ApiProperty({ description: 'Blog title', example: 'My First Blog Post' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Blog content in HTML', example: '<p>Hello World</p>' })
    @IsString()
    @IsNotEmpty()
    contentHtml: string;

    @ApiProperty({ description: 'Blog description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Optional slug, automatically generated if empty', required: false })
    @IsString()
    @IsOptional()
    slug?: string;

    @ApiProperty({ description: 'Thumbnail image URL', required: false })
    @IsString()
    @IsOptional()
    thumbnail?: string;

    @ApiProperty({ description: 'Array of topic IDs to associate with this blog', required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    topicIds?: string[];


}
