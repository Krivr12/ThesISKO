import app from "./app.js"; // import the exported app

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
