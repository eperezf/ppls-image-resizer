'use strict';

import { handler } from './index.mjs';

import eventJson from './event.json' with { type: "json" };


const event = eventJson
const context = {}
const result = await handler(event, context)