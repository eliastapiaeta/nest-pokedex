import { Injectable } from '@nestjs/common';

import { PokeResponse } from './interfaces/poke-response.interface';
import { PokemonService } from 'src/pokemon/pokemon.service';
import { CreatePokemonDto } from 'src/pokemon/dto/create-pokemon.dto';
import { AxiosAdapter } from 'src/common/adapters/axios.adapter';

@Injectable()
export class SeedService {
  constructor(
    private readonly pokemonService: PokemonService,
    private readonly http: AxiosAdapter,
  ) { }

  public async populateDB() {
    this.pokemonService.deleteAllPokemons();

    const data = await this.http.get<PokeResponse>('https://pokeapi.co/api/v2/pokemon?limit=1000&offset=0');

    const pokemonsToInsert : CreatePokemonDto[] = [];

    data.results.forEach(async ({ name, url }) => {
      const segments = url.split('/');
      const no: number = +segments[segments.length - 2];
      const createPokemonDto: CreatePokemonDto = {
        name: name.toLowerCase(),
        no: no
      }

      pokemonsToInsert.push(createPokemonDto);
    });
    
    const results = await this.pokemonService.fillDbPokemosWithSeed(pokemonsToInsert);

    return results;
  }
}
