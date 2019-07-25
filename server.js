var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;

var app = express();

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/", function (req, res) {
  db.Article.find({}).then(function (response) {
    var dbResponse = {
      articles: response
    };
    res.render("index", dbResponse);
  })
    .catch(function (err) {
      console.log(err);
      res.send(err);
    });
});

app.get("/scrape", function (req, res) {
  axios.get("https://www.pcgamer.com/news/").then(function (response) {
    var $ = cheerio.load(response.data);

    $("div.content").each(function (i, element) {
      var result = {};

      result.title = $(element)
        .children("header")
        .children("h3")
        .text();

      result.summary = $(element)
        .children("p")
        .text()
        .split("\n")[1];

      result.image = $(element)
        .parent()
        .children("div.image")
        .children()
        .data("original");

      result.link = $(element)
        .parent()
        .parent()
        .attr("href");

      db.Article.create(result)
        .then(function (dbArticle) {
          console.log(dbArticle);
        })
        .catch(function (err) {
          console.log(err);
        });
    });
    res.send("Scrape Complete");
  });
});

app.get("/articles", function (req, res) {
  db.Article.find({}).then(function (response) {
    res.send(response);
  })
    .catch(function (err) {
      console.log(err);
      res.send(err);
    });
});

app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: ObjectId(req.params.id) })
    .populate("note")
    .then(function (response) {
      res.send(response);
    })
    .catch(function (err) {
      console.log(err);
      res.send(err);
    })
});

app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findByIdAndUpdate({ _id: mongoose.ObjectId(req.params.id) });
    })
    .catch(function (err) {
      console.log(err);
      res.send(err);
    });
});

app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
