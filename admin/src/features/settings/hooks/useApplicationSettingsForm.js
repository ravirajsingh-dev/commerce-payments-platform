import { useEffect, useMemo, useState } from "react";
import { validateForm } from "@src/utils/validation";
import {
  isValidEmail,
  isValidName,
  sanitizeEmail,
  sanitizeName,
} from "@src/utils/inputValidation";

const createSectionId = () =>
  `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const emptyAboutSection = () => ({
  id: createSectionId(),
  heading: "",
  description: "",
  imageUrl: "",
  imageKey: "",
  image: null,
  imagePreview: null,
  clearImage: false,
});

const normalizeAboutSectionsFromApi = (sections, legacy = {}) => {
  if (Array.isArray(sections) && sections.length > 0) {
    return sections.map((sec, index) => ({
      id: sec?.id || createSectionId(),
      heading: sec?.heading ?? "",
      description: sec?.description ?? "",
      imageUrl: sec?.imageUrl ?? "",
      imageKey: sec?.imageKey ?? "",
      image: null,
      imagePreview: sec?.imageUrl || null,
      clearImage: false,
      order: typeof sec?.order === "number" ? sec.order : index,
    }));
  }

  const legacySections = [];
  if (legacy.mission) {
    legacySections.push({
      id: createSectionId(),
      heading: "Our Mission",
      description: legacy.mission,
      imageUrl: "",
      imageKey: "",
      image: null,
      imagePreview: null,
      clearImage: false,
    });
  }
  if (legacy.vision) {
    legacySections.push({
      id: createSectionId(),
      heading: "Our Vision",
      description: legacy.vision,
      imageUrl: "",
      imageKey: "",
      image: null,
      imagePreview: null,
      clearImage: false,
    });
  }
  return legacySections.length > 0 ? legacySections : [emptyAboutSection()];
};

const initialFormData = {
  name: "",
  abbreviation: "",
  contactUs: "",
  email: "",
  address: "",
  logo: null,
  logoUrl: "",
  socialMedia: {
    instagram: "",
    facebook: "",
    youtube: "",
    zoomMeeting: "",
  },
  loginEnabled: true,
  registerEnabled: true,
  flatShippingFee: 0,
  gstin: "",
  defaultGstRate: 0,
  lowStockThreshold: 5,
  aboutUs: {
    title: "",
    intro: "",
    sections: [emptyAboutSection()],
  },
  contactUsPage: {
    title: "",
    intro: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    address: "",
    businessHours: "",
  },
};

const normalizeSettingsToForm = (settings = {}) => ({
  name: settings.name || "",
  abbreviation: settings.abbreviation || "",
  contactUs: settings.contactUs || "",
  email: settings.email || "",
  address: settings.address || "",
  logo: null,
  logoUrl: settings.logoUrl || "",
  socialMedia: {
    instagram: settings.socialMedia?.instagram || "",
    facebook: settings.socialMedia?.facebook || "",
    youtube: settings.socialMedia?.youtube || "",
    zoomMeeting: settings.socialMedia?.zoomMeeting || "",
  },
  loginEnabled: settings.loginEnabled !== undefined ? settings.loginEnabled : true,
  registerEnabled:
    settings.registerEnabled !== undefined ? settings.registerEnabled : true,
  flatShippingFee:
    settings.flatShippingFee !== undefined ? Number(settings.flatShippingFee) : 0,
  gstin: settings.gstin || "",
  defaultGstRate:
    settings.defaultGstRate !== undefined ? Number(settings.defaultGstRate) : 0,
  lowStockThreshold:
    settings.lowStockThreshold !== undefined
      ? Number(settings.lowStockThreshold)
      : 5,
  aboutUs: {
    title: settings.aboutUs?.title || "",
    intro: settings.aboutUs?.intro || settings.aboutUs?.description || "",
    sections: normalizeAboutSectionsFromApi(settings.aboutUs?.sections, {
      mission: settings.aboutUs?.mission,
      vision: settings.aboutUs?.vision,
    }),
  },
  contactUsPage: {
    title: settings.contactUsPage?.title || "",
    intro: settings.contactUsPage?.intro || "",
    phone: settings.contactUsPage?.phone || "",
    secondaryPhone: settings.contactUsPage?.secondaryPhone || "",
    email: settings.contactUsPage?.email || "",
    address: settings.contactUsPage?.address || "",
    businessHours: settings.contactUsPage?.businessHours || "",
  },
});

export const useApplicationSettingsForm = ({
  commonSettings,
  setErrors,
  updateCommonSettings,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [isDisabled, setDisabled] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [txnPassword, setTxnPassword] = useState("");
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [txnPasswordError, setTxnPasswordError] = useState("");

  const hasLoadedSettings = useMemo(
    () => Boolean(commonSettings && Object.keys(commonSettings).length > 0),
    [commonSettings],
  );

  const localErrors = useMemo(() => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = "Please provide a valid name.";
    else if (!isValidName(formData.name)) {
      errors.name = "Name must be 3-50 characters and in valid format.";
    }

    if (!formData.contactUs?.trim()) {
      errors.contactUs = "Please provide contact information.";
    }

    if (!formData.email?.trim()) errors.email = "Please provide a valid email address.";
    else if (!isValidEmail(formData.email)) {
      errors.email = "Please provide a valid email format.";
    }

    const flatShippingFee = Number(formData.flatShippingFee);
    if (!Number.isFinite(flatShippingFee) || flatShippingFee < 0) {
      errors.flatShippingFee = "Shipping fee must be zero or greater.";
    }

    const lowStockThreshold = Number(formData.lowStockThreshold);
    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      errors.lowStockThreshold = "Low stock threshold must be zero or greater.";
    }

    const gstRate = Number(formData.defaultGstRate);
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      errors.defaultGstRate = "GST rate must be between 0 and 100.";
    }

    const gstin = String(formData.gstin || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    if (gstin && gstin.length !== 15) {
      errors.gstin = "GSTIN must be 15 characters when provided.";
    }

    return errors;
  }, [formData]);

  const isSettingsValid = Object.keys(localErrors).length === 0;

  useEffect(() => {
    if (!hasLoadedSettings) return;
    const nextForm = normalizeSettingsToForm(commonSettings);
    setFormData(nextForm);
    setLogoPreview(nextForm.logoUrl || null);
  }, [commonSettings, hasLoadedSettings]);

  const toggleEdit = () => setDisabled((prev) => !prev);

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrors([{ path: "logo", msg: "Logo size must be less than 2MB" }]);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors([
        {
          path: "logo",
          msg: "Only jpg, jpeg, png, and webp images are allowed",
        },
      ]);
      return;
    }

    setFormData((prev) => ({ ...prev, logo: file }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target || {};
    if (!name) return;
    let nextValue = type === "checkbox" ? checked : value;
    if (name === "name") nextValue = sanitizeName(value);
    if (name === "email" || name === "contactUsPage.email") {
      nextValue = sanitizeEmail(value);
    }

    if (
      name.startsWith("socialMedia.") ||
      name.startsWith("aboutUs.") ||
      name.startsWith("contactUsPage.")
    ) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: nextValue,
        },
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const patchAboutSections = (updater) => {
    setFormData((prev) => {
      const sections = updater([...(prev.aboutUs?.sections || [])]);
      return {
        ...prev,
        aboutUs: { ...prev.aboutUs, sections },
      };
    });
  };

  const onAboutSectionField = (index, field, value) => {
    patchAboutSections((list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const onAboutSectionImageChange = (index, file) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrors([
        { path: "aboutUs", msg: "Section image must be less than 2MB" },
      ]);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors([
        {
          path: "aboutUs",
          msg: "Only jpg, jpeg, png, and webp images are allowed",
        },
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      patchAboutSections((list) => {
        const copy = [...list];
        copy[index] = {
          ...copy[index],
          image: file,
          imagePreview: reader.result,
          clearImage: false,
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const clearAboutSectionImage = (index) => {
    patchAboutSections((list) => {
      const copy = [...list];
      copy[index] = {
        ...copy[index],
        image: null,
        imagePreview: null,
        imageUrl: "",
        imageKey: "",
        clearImage: true,
      };
      return copy;
    });
  };

  const addAboutSection = () => {
    patchAboutSections((list) => [...list, emptyAboutSection()]);
  };

  const removeAboutSection = (index) => {
    patchAboutSections((list) => {
      if (list.length <= 1) return [emptyAboutSection()];
      return list.filter((_, i) => i !== index);
    });
  };

  const moveAboutSection = (index, delta) => {
    patchAboutSections((list) => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  };

  const buildSubmitData = () => {
    const submitData = new FormData();
    submitData.append("name", formData.name);
    submitData.append("abbreviation", formData.abbreviation);
    submitData.append("contactUs", formData.contactUs);
    submitData.append("email", formData.email);
    submitData.append("address", formData.address);
    if (formData.logo) submitData.append("logo", formData.logo);
    submitData.append("socialMedia", JSON.stringify(formData.socialMedia));
    submitData.append("loginEnabled", String(formData.loginEnabled));
    submitData.append("registerEnabled", String(formData.registerEnabled));
    submitData.append("flatShippingFee", String(formData.flatShippingFee ?? 0));
    submitData.append("gstin", String(formData.gstin || "").trim().toUpperCase());
    submitData.append("defaultGstRate", String(formData.defaultGstRate ?? 0));
    submitData.append("lowStockThreshold", String(formData.lowStockThreshold ?? 5));

    const aboutUsPayload = {
      title: formData.aboutUs.title,
      intro: formData.aboutUs.intro,
      sections: (formData.aboutUs.sections || []).map((sec, order) => ({
        id: sec.id,
        heading: sec.heading,
        description: sec.description,
        imageUrl: sec.clearImage ? "" : sec.imageUrl || "",
        imageKey: sec.clearImage ? "" : sec.imageKey || "",
        clearImage: Boolean(sec.clearImage),
        order,
      })),
    };
    submitData.append("aboutUs", JSON.stringify(aboutUsPayload));

    (formData.aboutUs.sections || []).forEach((sec) => {
      if (sec.image instanceof File) {
        submitData.append(`aboutUsSection_${sec.id}`, sec.image);
      }
    });

    submitData.append("contactUsPage", JSON.stringify(formData.contactUsPage));
    return submitData;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      return;
    }

    setSubmitting(true);
    const validationRules = [
      { path: "name", msg: "Please provide a valid name." },
      { path: "contactUs", msg: "Please provide contact information." },
      { path: "email", msg: "Please provide a valid email address." },
    ];
    const errors = validateForm(formData, validationRules);
    if (errors.length) {
      setErrors(errors);
      setSubmitting(false);
      return;
    }

    setPendingSubmitData(buildSubmitData());
    setShowConfirmModal(true);
    setSubmitting(false);
  };

  const handleConfirmSave = () => {
    if (!txnPassword.trim()) {
      setTxnPasswordError("Transaction password is required.");
      return;
    }
    if (!pendingSubmitData) return;

    pendingSubmitData.append("txn_password", txnPassword.trim());
    updateCommonSettings(pendingSubmitData);
    setTxnPassword("");
    setTxnPasswordError("");
    setShowConfirmModal(false);
    setPendingSubmitData(null);
    setDisabled(true);
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
    setTxnPassword("");
    setTxnPasswordError("");
  };

  const onClickCancel = (e) => {
    e.preventDefault();
    const nextForm = normalizeSettingsToForm(commonSettings);
    setFormData(nextForm);
    setLogoPreview(nextForm.logoUrl || null);
    setDisabled(true);
  };

  return {
    formData,
    submitting,
    isDisabled,
    showConfirmModal,
    txnPassword,
    logoPreview,
    txnPasswordError,
    localErrors,
    isSettingsValid,
    toggleEdit,
    onLogoChange,
    onChange,
    onSubmit,
    setTxnPassword,
    setTxnPasswordError,
    handleConfirmSave,
    handleCloseModal,
    onClickCancel,
    addAboutSection,
    removeAboutSection,
    moveAboutSection,
    onAboutSectionField,
    onAboutSectionImageChange,
    clearAboutSectionImage,
  };
};
