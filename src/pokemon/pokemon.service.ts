import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';

import { MongoError, MongoBulkWriteError } from 'mongodb';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class PokemonService {

  private defaultLimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService,
  ) {
    // console.log(process.env.DEFAULT_LIMIT);
    
    this.defaultLimit = configService.get<number>('defaultLimit');
    console.log({defaultLimit: configService.get<number>('defaultLimit')});
  }

  public async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();

    try {
      return await this.pokemonModel.create(createPokemonDto);
    } catch (error) {
      this.handleException(error);
    }
  }

  public findAll(paginationDto: PaginationDto) {
    const { limit = this.defaultLimit, offset = 0 } = paginationDto;

    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({ no: 1 })
      .select('-__v');
  }

  public async findOne(term: string) {
    let pokemon: Pokemon;

    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: term });
    }

    // validate by Mongo id
    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term);
    }

    // validate by name
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.trim().toLowerCase() });
    }

    if (!pokemon) {
      throw new NotFoundException(`Pokemon with id, name or no "${term}" not found`);
    }

    return pokemon;
  }

  public async update(term: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(term);

    if (updatePokemonDto.name) {
      updatePokemonDto.name = updatePokemonDto.name.trim().toLowerCase();
    }

    try {
      await pokemon.updateOne(updatePokemonDto);
    } catch (error) {
      if (error instanceof MongoError && 'keyValue' in error)
        this.handleException(error, `Another pokemon exist in db with ${JSON.stringify(error.keyValue)}`);
    }

    return { ...pokemon.toJSON(), ...updatePokemonDto };
  }

  public async remove(id: string) {
    // const pokemon = await this.findOne(id);
    // await pokemon.deleteOne();

    const result = await this.pokemonModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Pokemon with id ${id} not found`);
    }

    return result;
  }


  public async deleteAllPokemons() {
    await this.pokemonModel.deleteMany({});
  }

  private handleException(error: any, _message: string = "") {
    if (error instanceof MongoError && 'keyValue' in error) {
      const message = (_message === "") ? `Pokemon exist in db ${JSON.stringify(error.keyValue)}` : _message;
      console.log(error);

      if (error.code === 11000) {
        throw new BadRequestException(message);
      } else {
        throw new InternalServerErrorException(`Can't create Pokemon - Check server logs`);
      }
    }

    if (error instanceof MongoBulkWriteError && error.code === 11000) {
      console.log('Error code:', error.code);
      console.log('Duplicate key:', error.writeErrors[0].err);
      const message = (_message === "") ? `Pokemon exist in db ${JSON.stringify(error.writeErrors[0].err)}` : _message;
      throw new BadRequestException(message);
    }

    throw new InternalServerErrorException(`Can't create Pokemon - Check server logs`);
  }


  public async fillDbPokemosWithSeed(createPokemonDto: CreatePokemonDto[]) {
    try {
      const result = await this.pokemonModel.insertMany(createPokemonDto);
      const insertedIds = result.map(doc => doc._id);

      return {
        success: true,
        insertedIds
      }
    } catch (error) {
      this.handleException(error);

      return {
        success: false,
      }
    }
  }
}

