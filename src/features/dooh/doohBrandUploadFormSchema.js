/** Schema for DynamicForm - brand outro uploads (DOOH brief). */

export const doohBrandUploadFormSchema = {
  fields: [
    {
      name: 'final_video',
      label: 'Final video',
      type: 'file',
      accept: 'video/*',
      hint: 'Max 150 MB per file.',
      className: 'w-full max-w-xl',
    },
  ],
  layout: [['final_video']],
}

export const doohBrandUploadDefaultValues = {
  final_video: undefined,
}
