import "dotenv/config";
import { publishMarketOpportunities } from "../lib/market-opportunities";

publishMarketOpportunities()
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
