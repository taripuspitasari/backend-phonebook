const personsRouter = require("express").Router();
const Person = require("../models/person");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const getTokenFrom = request => {
  const authorization = request.get("authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "");
  }
  return null;
};

personsRouter.get("/", async (request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET);
  if (!decodedToken.id) {
    return response.status(401).json({error: "token invalid"});
  }

  const persons = await Person.find({}).populate("user", {
    username: 1,
    name: 1,
  });
  response.json(persons.filter(person => person.user.id === decodedToken.id));
  // response.json(persons);
});

personsRouter.post("/", async (request, response, next) => {
  const {name, number} = request.body;

  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET);
  if (!decodedToken.id) {
    return response.status(401).json({error: "token invalid"});
  }

  // cari user terus assign di variable user
  const user = await User.findById(decodedToken.id);

  if (name === undefined || number === undefined) {
    return response.status(400).json({
      error: "content missing",
    });
  }

  const existingPerson = await Person.findOne({name});
  if (existingPerson) {
    return response.status(400).json({
      error: "Person number already exists",
    });
  }

  const person = new Person({
    name: name,
    number: number,
    user: user.id,
  });

  try {
    const savedPerson = await person.save();
    user.persons = user.persons.concat(savedPerson._id);
    await user.save();

    response.status(201).json(savedPerson);
  } catch (exception) {
    next(exception);
  }
});

personsRouter.get("/:id", async (request, response, next) => {
  try {
    const person = await Person.findById(request.params.id);
    if (person) {
      response.json(person);
    } else {
      response.status(404).end();
    }
  } catch (exception) {
    next(exception);
  }
});

personsRouter.delete("/:id", async (request, response, next) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET);
  if (!decodedToken.id) {
    return response.status(401).json({error: "token invalid"});
  }

  try {
    const deletedPerson = await Person.findByIdAndDelete(request.params.id);
    response.json(deletedPerson).status(204);
  } catch (exception) {
    next(exception);
  }
});

personsRouter.put("/:id", async (request, response, next) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET);
  if (!decodedToken.id) {
    return response.status(401).json({error: "token invalid"});
  }

  const {name, number} = request.body;
  try {
    const changedPerson = await Person.findByIdAndUpdate(
      request.params.id,
      {name, number},
      {new: true, runValidators: true, context: "query"}
    );
    response.json(changedPerson);
  } catch (exception) {
    next(exception);
  }
});

module.exports = personsRouter;
