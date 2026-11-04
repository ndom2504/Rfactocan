import { publishCommunityNews } from "../lib/community-news";

publishCommunityNews()
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
