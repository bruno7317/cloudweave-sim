import { request, gql } from "graphql-request"
import Country from "../models/Country"

const GQL_ENDPOINT = 'http://localhost:8000/graphql'

const GET_COUNTRIES = gql`
    query {
        countries {
            name
            money_reserves
            resources {
                stockpile
                production
                consumption
            }
        }
    }
`

type RawCountry = {
    name: string;
    money_reserves: number;
    resources: {
        stockpile: number;
        production: number;
        consumption: number;
    }[];
}

async function getCountries() {
    const result = await request(GQL_ENDPOINT, GET_COUNTRIES) as { countries: RawCountry[] };

    const rawcountries = result.countries;

    if (!Array.isArray(rawcountries)) throw new Error(`Expected an array from GraphQL, got ${rawcountries} instead.`)

    const countries: Country[] = [];
    for (const rawcountry of rawcountries) {
        const resource = rawcountry.resources?.[0]

        if (!resource) {
            throw new Error(`[DATA] No resources found for country ${rawcountry.name}`);
        }

        const country = new Country({
            name: rawcountry.name,
            money_reserves: rawcountry.money_reserves,
            stockpile: resource.stockpile,
            production_rate: resource.production,
            consumption_rate: resource.consumption
        });
        countries.push(country);
    }

    return countries;
}

export default getCountries
