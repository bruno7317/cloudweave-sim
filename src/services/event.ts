import { request, gql } from "graphql-request"
import { EventInput } from "../models/EventInput"

const GQL_ENDPOINT = 'http://localhost:8000/graphql'

const ADD_EVENTS = gql`
    mutation AddEvents($events: [EventInput!]!) {
        addEvents(events: $events)
    }
`

async function postEvents(events: EventInput[]): Promise<boolean> {
    if (!Array.isArray(events)) {
        throw new Error(`Expected an array of events, got: ${events}`)
    }

    const result = await request(GQL_ENDPOINT, ADD_EVENTS, { events }) as { addEvents: boolean }

    return result.addEvents
}

export default postEvents
