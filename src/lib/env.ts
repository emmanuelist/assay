import { config } from "dotenv";
// Scripts run outside Next, which loads .env.local itself. Match that order.
config({ path: ".env.local" });
config({ path: ".env" });
