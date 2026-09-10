import elasticsearch from "../config/elasticsearch";

const INDEX_NAME = "emails";

export async function createEmailIndex() {
  const exists = await elasticsearch.indices.exists({
    index: INDEX_NAME,
  });

  if (exists.body) return;

  await elasticsearch.indices.create({
    index: INDEX_NAME,
    body: {
      mappings: {
        properties: {
          email_id: {
            type: "keyword",
          },

          user_id: {
            type: "keyword",
          },

          campaign_id: {
            type: "keyword",
          },

          recipient_email: {
            type: "keyword",
          },

          recipient_name: {
            type: "text",
          },

          subject: {
            type: "text",
          },

          body: {
            type: "text",
          },

          status: {
            type: "keyword",
          },

          scheduled_at: {
            type: "date",
          },

          sent_at: {
            type: "date",
          },
        },
      },
    },
  });

  console.log(
    `Elasticsearch index "${INDEX_NAME}" created`
  );
}

export async function indexEmail(email: {
  id: string;
  user_id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  body: string;
  status: string;
  scheduled_at: string | Date;
  sent_at?: string | Date | null;
}) {
  await elasticsearch.index({
    index: INDEX_NAME,
    id: email.id,

    body: {
      email_id: email.id,

      user_id: email.user_id,

      campaign_id: email.campaign_id,

      recipient_email: email.recipient_email,

      recipient_name:
        email.recipient_name ?? null,

      subject: email.subject,

      body: email.body,

      status: email.status,

      scheduled_at: email.scheduled_at,

      sent_at: email.sent_at ?? null,
    },

    refresh: "wait_for",
  });
}

export async function updateEmailIndex(
  emailId: string,
  data: {
    status?: string;
    sent_at?: string | Date | null;
  }
) {
  try {
    await elasticsearch.update({
      index: INDEX_NAME,
      id: emailId,

      body: {
        doc: data,
      },

      refresh: "wait_for",
    });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      console.log(
        `Elasticsearch document ${emailId} not found. ` +
          `Skipping index update.`
      );

      return;
    }

    throw error;
  }
}