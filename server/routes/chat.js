const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to get messages" });
  }
});

router.post("/messages", async (req, res) => {
  const { text, sender } = req.body;
  try {
    const message = new Message({ text, sender });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;