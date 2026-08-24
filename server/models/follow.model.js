const {mongoose}=require('mongoose')

const FollowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    topicId: {
      type: String,
      required: true,
    },

    channels: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
FollowSchema.index({ topicId: 1 });
FollowSchema.index({ userId: 1 });

const Follow = mongoose.model("Follow", FollowSchema);

module.exports = Follow;