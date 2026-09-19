import { useCallback } from "react";
import { Col, Form, Row } from "react-bootstrap";

import CustomSelect from "@src/components/common/CustomSelect";
import CopyIcon from "@src/components/common/CopyIcon";
import Errors from "@src/notifications/Errors";
import { USER_STATUS_OPTIONS, getStatusOptionByValue } from "@src/constants";

const UserFormFields = ({
  formData,
  onInputChange,
  onFieldBlur,
  isEditMode = false,
  currentPasswordValue = "",
  onCopyCurrentPassword,
  localErrors = {},
}) => {
  const loadStatusOptions = useCallback(() => USER_STATUS_OPTIONS, []);
  const handleBlur = (e) => {
    onFieldBlur?.(e.target?.name);
  };

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>Name *</Form.Label>
          <Form.Control
            name="name"
            value={formData.name}
            onChange={onInputChange}
            maxLength={50}
          />
          <Errors current_key="name" message={localErrors.name} />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>Phone *</Form.Label>
          <Form.Control
            name="phone"
            value={formData.phone}
            onChange={onInputChange}
            onBlur={handleBlur}
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit phone number"
          />
          <Errors current_key="phone" message={localErrors.phone} />
        </Form.Group>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Label>Email *</Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={formData.email}
            onChange={onInputChange}
            onBlur={handleBlur}
            maxLength={254}
          />
          <Errors current_key="email" message={localErrors.email} />
        </Form.Group>
      </Col>
      {isEditMode ? (
        <>
          <Col md={12}>
            <Form.Group>
              <Form.Label>Current Password</Form.Label>
              <div className="d-flex align-items-center gap-2">
                <Form.Control
                  type="text"
                  value={currentPasswordValue}
                  readOnly
                  placeholder="No existing password"
                />
                <CopyIcon
                  textToCopy={currentPasswordValue || ""}
                  className="copy-action"
                  onCopy={onCopyCurrentPassword}
                />
              </div>
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group>
              <Form.Label>New Password (Optional)</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={onInputChange}
                onBlur={handleBlur}
                placeholder="Leave blank to keep current password"
                maxLength={128}
              />
              <Errors
                current_key="newPassword"
                message={localErrors.newPassword}
              />
            </Form.Group>
          </Col>
        </>
      ) : (
        <Col md={12}>
          <Form.Group>
            <Form.Label>Password *</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={onInputChange}
              onBlur={handleBlur}
              maxLength={128}
            />
            <Errors current_key="password" message={localErrors.password} />
          </Form.Group>
        </Col>
      )}
      <Col md={12}>
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOptionByValue(formData.status)}
            onChange={(option) =>
              onInputChange({
                target: { name: "status", value: option?.value ?? 1 },
              })
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </Col>
    </Row>
  );
};

export default UserFormFields;
