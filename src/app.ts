import express from "express";
import type { Request, Response } from "express";
import { scrapeSponsoredProducts } from "./amazon/scrape";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is running" });
});

app.get("/amazon/scrape/sponsored-products", async(req: Request, res: Response) => {

  const q = req.query.q as string;

  if (!q) {
    res.status(400).json({ error: `クエリパラメーターの"q"が必要です: /amazon/scrape/sponsored-products?q=<word1>,<word2>` });
    return;
  }

  const keywords = q
    .split(",")
    .map(kw => kw.trim())
    .filter(kw => kw.length > 0);


  if (keywords.length === 0) {
    res.status(400).json({ error: "有効なパラメーターを指定してください" });
    return;
  }

  try {
    const sponsoredProducts = await scrapeSponsoredProducts(keywords);

    if (sponsoredProducts.length === 0) {
      res.status(400).json({ error: "広告商品が見つかりませんでした" });
      return;
    }

    res.json({ sponsoredProducts });
  } catch(e) {
    res.status(500).json({ error: "スクレイピングに失敗しました" });
  }

});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
