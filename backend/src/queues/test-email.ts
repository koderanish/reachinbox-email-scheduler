import { emailQueue } from "./email.queue";

async function addEmailJob() {
  const job = await emailQueue.add(
    "send-email",
    {
      senderId: "a1aacbb1-1169-451e-b642-c770bd6fb4ea",
      recipientEmail: "mr.anish.kmr@gmail.com",
      subject: "ReachInbox Test Email",
      body: "Hello! This email was sent through BullMQ and Ethereal SMTP.",
    },
    {
      delay: 5000,
      removeOnComplete: false,
      removeOnFail: false,
    }
  );

  console.log("Email job created:", job.id);
  console.log("Sending in 5 seconds...");
}

addEmailJob();