import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Model, isValidObjectId } from 'mongoose';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class PokemonService {

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>
  ) { }

  public async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto);
      return pokemon;
    } catch (error) {
      if (typeof error === 'object' && 'keyValue' in error) 
        this.handleException(error, `Pokemon exist in db ${JSON.stringify(error.keyValue)}`);
    }
  }

  findAll() {
    return `This action returns all pokemon`;
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
      if (typeof error === 'object' && 'keyValue' in error)
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

  private handleException(error: any, message: string) {
    if (error.code === 11000) {
      throw new BadRequestException(message);
    }
    console.log(error);
    throw new InternalServerErrorException(`Can't create Pokemon - Check server logs`);
  }
}

