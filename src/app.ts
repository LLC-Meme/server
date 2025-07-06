import express, { Request, Response } from "express";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is running" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
