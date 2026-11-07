import "dotenv/config";
import { publishCommunityTrends } from "../lib/community-trends";

publishCommunityTrends()
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
