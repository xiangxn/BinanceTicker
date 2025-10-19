import dotenv from 'dotenv'
dotenv.config()

import { config } from '../src/config';
import { isValid } from '@tma.js/init-data-node';


const ins:string = "<init data>"

console.log(
isValid(
    ins, 
    config.TG_API_KEY,
    {expiresIn:0}
))