import "dotenv/config";
import { publishBarreauResources } from "../lib/community-barreau";

publishBarreauResources()
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
