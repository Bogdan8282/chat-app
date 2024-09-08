const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

const deleteOldMessages = async () => {
  try {
    const result = await Message.deleteMany({
      timestamp: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    console.log(`Deleted ${result.deletedCount} old messages`);
  } catch (err) {
    console.error("Error deleting old messages:", err);
  }
};

setInterval(deleteOldMessages, 60 * 60 * 1000);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected");

  Message.find()
    .sort({ timestamp: -1 })
    .limit(50)
    .then((messages) => {
      const formattedMessages = messages.map((msg) => ({
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
      }));
      socket.emit("messages", formattedMessages);
    })
    .catch((err) => console.error("Error fetching messages:", err));

  socket.on("message", async (message) => {
    try {
      const newMessage = new Message({
        sender: message.username,
        text: message.text,
      });
      await newMessage.save();
     io.emit("message", {
       sender: message.username,
       text: message.text,
       timestamp: newMessage.timestamp,
     });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.get("/api/chat/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Server error");
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
