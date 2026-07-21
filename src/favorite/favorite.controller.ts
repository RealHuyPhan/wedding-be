import { Body, Controller, Delete, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Favorite')
@ApiBearerAuth()
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) { }

  @ApiOperation({ summary: "Favorite items", description: 'List of favorite items' })
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getFavorites(@Request() req: { user: { id: string } }) {
    return this.favoriteService.getFavorites(req.user.id);
  }

  @ApiOperation({ summary: "Add to Favorite", description: 'Add to favorite' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  addToFavorite(@Request() req: { user: { id: string } }, @Body() createFavoriteDto: CreateFavoriteDto) {
    return this.favoriteService.addToFavorite(req.user.id, createFavoriteDto);
  }

  @ApiOperation({ summary: "Remove from Favorite", description: 'Remove favorite' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':productId')
  removeFromFavorite(@Request() req: { user: { id: string } }, @Param('productId') productId: string) {
    return this.favoriteService.removeFromFavorite(req.user.id, productId);
  }


}
