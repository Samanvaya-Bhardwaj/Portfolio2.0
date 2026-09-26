/** Shared schema options: timestamps and clean JSON output (`id` instead of `_id`, no `__v`). */
export const baseOptions = {
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
};

/** Fields shared by every orderable, publishable collection. */
export const displayFields = {
  order: { type: Number, default: 0, index: true },
  visible: { type: Boolean, default: true, index: true },
};
