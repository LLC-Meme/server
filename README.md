# Expressサーバー

ローカルのexpressサーバーをngrokを通じてデプロイし
呼び出すためのプロジェクト

## 起動方法
1. `npm run build`
2. `npm run start`
3. `ngrok http http://localhost:3000`


## API Routes

### /amazon/scrape/sponsored-products
パラメーターに検索したいワードをエンコードした状態で指定
`curl https://localhost:3000/amazon/scrape/sponsored-products?q=<word1>,<word2>`

例
```
curl "http://localhost:3000/amazon/scrape/sponsored-products?q=%E5%8C%96%E7%B2%A7%E6%B0%B4,%E7%BE%8E%E7%99%BD"
```