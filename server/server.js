const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const dayjs = require("dayjs");
const PORT = 8000;
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

// const uri = process.env.ATLAS_URI;
// mongoose.connect(uri, { useNewUrlParser: true });
// const connection = mongoose.connection;
// connection.once('open', () => {
//   console.log("MongoDB database connection established successfully");
// });

app.use(cors());
app.use(express.json());

const userRouter = require("./routes/userRouter");
const apiRouter = require("./routes/apiRouter");

app.use("/user", userRouter);
app.use("/api", apiRouter);

const apiController = require("./controller/apiController");

apiRouter.post("/", apiController.getResponse, (req, res) => {
  res.status(200).json(res.locals.ideas);
});

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);
const scopes = ["https://www.googleapis.com/auth/calendar"];
const calendar = google.calendar({
  version: "v3",
  auth: process.env.API_KEY,
});
app.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  return res.json(url);
});
app.get("/google/redirect", async (req, res) => {
  console.log(req.query);
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return res.status(200).json({ msg: "Thank you for allowing us to access your Google Calendar!! You can close this now"});
});
app.get("/schedule_event", async (req, res) => {
  console.log(oauth2Client.credentials.access_token);
  await calendar.events.insert({
    calendarId: "primary",
    auth: oauth2Client,
    requestBody: {
      summary: "This is a test event",
      description: "Some event",
      start: {
        dateTime: dayjs(new Date()).add(1, "day").toISOString(),
        timeZone: "GMT-4",
      },
      end: {
        dateTime: dayjs(new Date()).add(1, "day").add(1, "hour").toISOString(),
        timeZone: "GMT-4",
      },
    },
  });
  res.send({
    msg: "Done",
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"] 
  }
});

io.on("connection", (socket) => {
  console.log('a user connected');

  socket.on("latest", (msg) => {
    console.log('Latest message: ' + msg);
  });

  socket.on("message", (msg) => {
    console.log('Received a message: ' + msg);
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log('user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}... idea generator app`);
});
