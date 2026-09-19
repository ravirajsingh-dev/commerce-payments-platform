const mongoose = require("mongoose");
const { Schema } = mongoose;
const COMMON_SETTINGS_SINGLETON_KEY = "GLOBAL";

const CommonSettingsSchema = new Schema(
  {
    // General Information
    name: {
      type: String,
      required: true,
      trim: true,
      default: "PROJECT",
    },
    contactUs: {
      type: String,
      required: true,
      trim: true,
      default: "9999999999",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: "support@example.com",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    abbreviation: {
      type: String,
      trim: true,
      default: "",
    },
    singletonKey: {
      type: String,
      required: true,
      default: COMMON_SETTINGS_SINGLETON_KEY,
      immutable: true,
      unique: true,
      index: true,
    },

    // Logo
    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    logoKey: {
      type: String,
      trim: true,
      default: "",
    },

    // Social Media Links
    socialMedia: {
      instagram: {
        type: String,
        trim: true,
        default: "",
      },
      facebook: {
        type: String,
        trim: true,
        default: "",
      },
      youtube: {
        type: String,
        trim: true,
        default: "",
      },
      zoomMeeting: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Authentication Settings
    loginEnabled: {
      type: Boolean,
      default: true,
    },
    registerEnabled: {
      type: Boolean,
      default: true,
    },

    /** Single flat shipping fee (INR) applied at checkout until shipping zones (Block D). */
    flatShippingFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    /** Seller GSTIN shown on invoices and order snapshots (Phase 3). */
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    /** Default GST rate (%) applied to taxable order amount after discounts. */
    defaultGstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /** Alert when variant stock is at or below this level (Phase 53). */
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
    },

    // About Us Page Content (e-commerce brand story sections)
    aboutUs: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      intro: {
        type: String,
        trim: true,
        default: "",
      },
      sections: [
        {
          id: { type: String, trim: true, default: "" },
          heading: { type: String, trim: true, default: "" },
          description: { type: String, trim: true, default: "" },
          imageUrl: { type: String, trim: true, default: "" },
          imageKey: { type: String, trim: true, default: "" },
          order: { type: Number, default: 0 },
        },
      ],
    },

    // Contact Us Page Content (e-commerce storefront)
    contactUsPage: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      intro: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      secondaryPhone: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
      businessHours: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
);

CommonSettingsSchema.index(
  { singletonKey: 1 },
  { unique: true, name: "common_settings_singleton_key_unique" },
);

// Singleton guard: only one common settings document is allowed.
CommonSettingsSchema.pre("save", async function () {
  if (!this.singletonKey) {
    this.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
  }

  if (!this.isNew) {
    return;
  }

  const existingSettings = await this.constructor.exists({
    _id: { $ne: this._id },
  });
  if (existingSettings) {
    throw new Error("Not allowed: common settings already exist");
  }
});

let CommonSettings;

// Static method to get or create settings (ensures only one document exists)
CommonSettingsSchema.statics.getOrCreateSettings = async () => {
  try {
    // Keep the oldest document and remove accidental duplicates.
    let settings = await CommonSettings.findOne().sort({ createdAt: 1, _id: 1 });

    if (settings) {
      if (settings.singletonKey !== COMMON_SETTINGS_SINGLETON_KEY) {
        await CommonSettings.updateOne(
          { _id: settings._id },
          { $set: { singletonKey: COMMON_SETTINGS_SINGLETON_KEY } },
        );
        settings.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
      }

      await CommonSettings.deleteMany({ _id: { $ne: settings._id } });
      return settings;
    }

    settings = await CommonSettings.findOneAndUpdate(
      { singletonKey: COMMON_SETTINGS_SINGLETON_KEY },
      {
        $setOnInsert: {
          singletonKey: COMMON_SETTINGS_SINGLETON_KEY,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );
    console.log("✅ Common Settings Created");

    return settings;
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await CommonSettings.findOne({
        singletonKey: COMMON_SETTINGS_SINGLETON_KEY,
      });
      if (existing) {
        return existing;
      }
    }
    console.error("Error in getOrCreateSettings:", error);
    throw error;
  }
};

CommonSettings = mongoose.model("common_settings", CommonSettingsSchema);

module.exports = CommonSettings;
