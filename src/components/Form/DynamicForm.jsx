import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Input, DepartmentSelect, Button } from "../ui";

export default function DynamicForm({
  schema,
  defaultValues,
  validationSchema,
  onSubmit: onSubmitProp,
  transformPayload,
  submitLabel = "Save",
  submitLabelEditing,
  submittingLabel = "Saving…",
  isEditing = false,
  submitting = false,
  className = "",
  children,
  /** @see Button — default matches previous full-width `sm` submit */
  submitButtonVariant = "primary",
  submitButtonSize = "sm",
  submitFullWidth = true,
  submitButtonClassName = "",
}) {
  const { fields, layout } = schema;
  const fieldMap = Object.fromEntries(fields.map((f) => [f.name, f]));

  const formOptions = {
    defaultValues,
  };
  if (validationSchema) {
    formOptions.resolver = yupResolver(validationSchema);
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm(formOptions);

  const prevDefaultsJson = useRef("");
  useEffect(() => {
    const json = JSON.stringify(defaultValues);
    if (json !== prevDefaultsJson.current) {
      prevDefaultsJson.current = json;
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const rows = layout ?? fields.map((f) => [f.name]);

  async function onSubmit(data) {
    const payload = transformPayload ? transformPayload(data) : data;
    await onSubmitProp(payload);
  }

  function renderField(field) {
    const {
      name,
      label,
      type,
      options = [],
      required,
      className: fieldClassName = "",
      ...inputProps
    } = field;
    const error = errors[name]?.message;
// deliverable departement from management/deliverables
    if (type === "department") {
      return (
        <DepartmentSelect
          key={name}
          label={required ? `${label} *` : label}
          error={error}
          placeholder={inputProps.placeholder ?? "Select departmenst…"}
          {...register(name)}
          {...inputProps}
        />
      );
    }

    if (type === "select") {
      return (
        <div key={name} className="input-wrap">
          <label className="input-label">{required ? `${label} *` : label}</label>
          <select className={`input ${error ? "border-red-300 focus:border-red-500" : ""}`} {...register(name)} {...inputProps}>
            {inputProps.placeholder ? <option value="">{inputProps.placeholder}</option> : null}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error ? <p className="input-error">{error}</p> : null}
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div key={name} className={fieldClassName}>
          <Input
            as="textarea"
            label={required ? `${label} *` : label}
            error={error}
            {...register(name)}
            {...inputProps}
          />
        </div>
      );
    }

    if (type === "file") {
      return (
        <div key={name} className={fieldClassName}>
          <Input
            label={required ? `${label} *` : label}
            type="file"
            error={error}
            {...register(name)}
            {...inputProps}
          />
        </div>
      );
    }

    // text, number, etc.
    return (
      <div key={name} className={fieldClassName}>
        <Input
          label={required ? `${label} *` : label}
          type={type === "number" ? "number" : "text"}
          error={error}
          {...register(
            name,
            validationSchema
              ? {}
              : { required: required ? `${label} is required` : false },
          )}
          {...inputProps}
        />
      </div>
    );
  }

  const submitButtonLabel =
    isEditing && submitLabelEditing ? submitLabelEditing : submitLabel;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-4 ${className}`}
    >
      {Object.keys(errors).length > 0 && (
        <div className="text-sm text-red-600 bg-red-50  rounded-lg px-3 py-2 space-y-1">
          <p className="font-medium">Please fix the errors below first:</p>
          <ul className="list-disc list-inside text-red-700 dark:text-red-300">
            {Object.entries(errors)
              .filter(([, e]) => e?.message)
              .map(([key, e]) => (
                <li key={key}>{e.message}</li>
              ))}
          </ul>
        </div>
      )}
      {rows.map((rowNames, rowIndex) => (
        <div
          key={rowIndex}
          className={
            rowNames.length > 1 ? "flex flex-wrap gap-2 items-end" : ""
          }
        >
          {rowNames.map((name) => {
            const field = fieldMap[name];
            if (!field) return null;
            const wrapClass =
              field.className || (rowNames.length > 1 ? "flex-1" : "");
            return (
              <div key={name} className={wrapClass}>
                {renderField(field)}
              </div>
            );
          })}
        </div>
      ))}
      {children}
      <Button
        type="submit"
        variant={submitButtonVariant}
        size={submitButtonSize}
        fullWidth={submitFullWidth}
        className={submitButtonClassName}
        loading={submitting}
        disabled={submitting}
      >
        {submitting ? submittingLabel : submitButtonLabel}
      </Button>
    </form>
  );
}
