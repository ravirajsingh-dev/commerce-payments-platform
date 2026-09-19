import { connect } from "react-redux";
import { Button, Container, Form } from "react-bootstrap";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { setErrors } from "@src/features/auth/authActions";
import { updateCommonSettings } from "@src/app/state/actions/commonActions";
import { useApplicationSettingsForm } from "./hooks/useApplicationSettingsForm";
import {
  AboutUsSection,
  AuthenticationSettingsSection,
  CommerceSettingsSection,
  ContactUsSection,
  GeneralInformationSection,
  SocialMediaSection,
} from "./components/ApplicationSettingsSections";
import SettingsConfirmModal from "./components/SettingsConfirmModal";

const ApplicationSettings = ({
  errorList,
  setErrors,
  updateCommonSettings,
  common: { commonSettings, loadingCommonSettings, loadingOnSubmit },
}) => {
  const {
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
  } = useApplicationSettingsForm({
    commonSettings,
    setErrors,
    updateCommonSettings,
  });

  if (loadingCommonSettings) {
    return (
      <Container>
        <AppBreadCrumb breadcrumbs={[{ label: "Application Settings" }]} />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container className="common-settings">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Application Settings" },
        ]}
      />

      <Form onSubmit={onSubmit} autoComplete="off">
        <div className="common-settings__header">
          <div>
            <h2 className="common-settings__title">Application Settings</h2>
            <p className="common-settings__subtitle">
              Manage branding, contact details, auth toggles, and public page
              content from one place.
            </p>
          </div>
          <Button
            variant={null}
            className="btn btn--outline common-settings__edit-btn"
            onClick={toggleEdit}
          >
            {isDisabled ? <MdEdit size={18} /> : <FaRegEye size={18} />}
            <span>{isDisabled ? "Edit" : "Preview"}</span>
          </Button>
        </div>

        <GeneralInformationSection
          formData={formData}
          errorList={errorList}
          localErrors={localErrors}
          isDisabled={isDisabled}
          logoPreview={logoPreview}
          onChange={onChange}
          onLogoChange={onLogoChange}
        />
        <SocialMediaSection
          formData={formData}
          isDisabled={isDisabled}
          onChange={onChange}
        />
        <CommerceSettingsSection
          formData={formData}
          isDisabled={isDisabled}
          onChange={onChange}
          localErrors={localErrors}
        />
        <AuthenticationSettingsSection
          formData={formData}
          isDisabled={isDisabled}
          onChange={onChange}
        />
        <AboutUsSection
          formData={formData}
          isDisabled={isDisabled}
          onChange={onChange}
          addAboutSection={addAboutSection}
          removeAboutSection={removeAboutSection}
          moveAboutSection={moveAboutSection}
          onAboutSectionField={onAboutSectionField}
          onAboutSectionImageChange={onAboutSectionImageChange}
          clearAboutSectionImage={clearAboutSectionImage}
        />
        <ContactUsSection
          formData={formData}
          isDisabled={isDisabled}
          onChange={onChange}
        />

        <div className="text-end pb-3">
          <Button
            className="me-2 btn btn--theme btn--disabled-theme"
            type="submit"
            disabled={submitting || loadingOnSubmit || isDisabled || !isSettingsValid}
          >
            {submitting || loadingOnSubmit ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            className="btn btn--danger btn--disabled-theme"
            onClick={onClickCancel}
            disabled={submitting || loadingOnSubmit || isDisabled}
          >
            Cancel
          </Button>
        </div>
      </Form>

      <SettingsConfirmModal
        show={showConfirmModal}
        onHide={handleCloseModal}
        onConfirm={handleConfirmSave}
        txnPassword={txnPassword}
        txnPasswordError={txnPasswordError}
        setTxnPassword={setTxnPassword}
        clearTxnPasswordError={() => setTxnPasswordError("")}
      />
    </Container>
  );
};

const mapStateToProps = (state) => ({
  errorList: state.errors || {},
  common: state.common,
});

export default connect(mapStateToProps, {
  setErrors,
  updateCommonSettings,
})(ApplicationSettings);
