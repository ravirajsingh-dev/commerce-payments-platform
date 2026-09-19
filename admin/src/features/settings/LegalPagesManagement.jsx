import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Button, Col, Container, Form, Row, Tab, Tabs } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaPlus, FaSave, FaTrash } from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import {
  getLegalPages,
  updateLegalPage,
} from "@src/features/settings/legalPagesActions";

const TABS = [
  { slug: "returns-and-refunds", label: "Returns & Refunds" },
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "terms-and-conditions", label: "Terms & Conditions" },
];

const emptySection = () => ({ heading: "", text: "" });

const emptyBySlug = () =>
  TABS.reduce((acc, { slug }) => {
    acc[slug] = { title: "", sections: [emptySection()] };
    return acc;
  }, {});

const normalizeSectionsFromApi = (sections) => {
  if (Array.isArray(sections) && sections.length > 0) {
    return sections.map((s) => ({
      heading: s?.heading ?? "",
      text: s?.text ?? "",
    }));
  }
  return [emptySection()];
};

const LegalPagesManagement = ({
  getLegalPages,
  updateLegalPage,
}) => {
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);
  const [activeSlug, setActiveSlug] = useState(TABS[0].slug);
  const [drafts, setDrafts] = useState(emptyBySlug);

  const activeTabLabel = useMemo(
    () => TABS.find((t) => t.slug === activeSlug)?.label ?? "",
    [activeSlug],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    const result = await getLegalPages();
    if (result?.status && Array.isArray(result.data)) {
      const next = emptyBySlug();
      result.data.forEach((row) => {
        if (row?.slug && next[row.slug] !== undefined) {
          next[row.slug] = {
            title: row.title ?? "",
            sections: normalizeSectionsFromApi(row.sections),
          };
        }
      });
      setDrafts(next);
    }
    setLoading(false);
  }, [getLegalPages]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onTitle = (slug, value) => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], title: value },
    }));
  };

  const patchSections = (slug, updater) => {
    setDrafts((prev) => {
      const cur = prev[slug];
      const sections = updater([...(cur?.sections || [])]);
      return { ...prev, [slug]: { ...cur, sections } };
    });
  };

  const onSectionField = (slug, index, field, value) => {
    patchSections(slug, (list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSection = (slug) => {
    patchSections(slug, (list) => [...list, emptySection()]);
  };

  const removeSection = (slug, index) => {
    patchSections(slug, (list) => {
      if (list.length <= 1) return [emptySection()];
      return list.filter((_, i) => i !== index);
    });
  };

  const moveSection = (slug, index, delta) => {
    patchSections(slug, (list) => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  };

  const onSave = async (slug) => {
    setSavingSlug(slug);
    const { title, sections } = drafts[slug] || {};
    await updateLegalPage(slug, { title, sections });
    setSavingSlug(null);
  };

  if (loading) {
    return (
      <Container>
        <AppBreadCrumb breadcrumbs={[{ label: "Legal & policy pages" }]} />
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container className="py-3">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Legal & policy pages", link: "/admin/legal-pages" },
          ...(activeTabLabel ? [{ label: activeTabLabel }] : []),
        ]}
      />

      <Row className="justify-content-center p-2">
        <Col xs={12}>
          <div className="common-form-card user-profile-card legal-pages-admin">
            <Row>
              <Col className="custom-heading-theam">Legal & policy pages</Col>
            </Row>

            <Tabs
              activeKey={activeSlug}
              onSelect={(tabKey) => tabKey && setActiveSlug(tabKey)}
              className="mb-3 user-profile-tabs"
            >
              {TABS.map(({ slug, label }) => {
                const sections = drafts[slug]?.sections || [emptySection()];
                return (
                  <Tab key={slug} eventKey={slug} title={label}>
                    <Form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSave(slug);
                      }}
                    >
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor={`legal-page-title-${slug}`} className="form-sub-label">
                          Page title
                        </Form.Label>
                        <Form.Control
                          id={`legal-page-title-${slug}`}
                          type="text"
                          value={drafts[slug]?.title ?? ""}
                          onChange={(e) => onTitle(slug, e.target.value)}
                          placeholder={`e.g. ${label}`}
                          className="text-muted"
                        />
                      </Form.Group>

                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                        <span className="form-sub-label mb-0">Sections</span>
                        <Button
                          type="button"
                          className="btn btn--outline btn-sm"
                          onClick={() => addSection(slug)}
                        >
                          <FaPlus className="me-1" />
                          Add section
                        </Button>
                      </div>

                      {sections.map((sec, index) => (
                        <div key={`${slug}-sec-${index}`} className="legal-pages-admin__section">
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <span className="legal-pages-admin__section-meta">
                              Section {index + 1}
                            </span>
                            <div className="d-flex gap-1">
                              <Button
                                type="button"
                                className="btn btn--outline btn-sm"
                                disabled={index === 0}
                                onClick={() => moveSection(slug, index, -1)}
                                aria-label="Move up"
                              >
                                <FaArrowUp />
                              </Button>
                              <Button
                                type="button"
                                className="btn btn--outline btn-sm"
                                disabled={index >= sections.length - 1}
                                onClick={() => moveSection(slug, index, 1)}
                                aria-label="Move down"
                              >
                                <FaArrowDown />
                              </Button>
                              <Button
                                type="button"
                                className="btn btn--danger btn-sm"
                                onClick={() => removeSection(slug, index)}
                                aria-label="Remove section"
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </div>
                          <Form.Group className="mb-2">
                            <Form.Label className="form-sub-label small">Heading</Form.Label>
                            <Form.Control
                              type="text"
                              value={sec.heading ?? ""}
                              onChange={(e) => onSectionField(slug, index, "heading", e.target.value)}
                              placeholder="e.g. Service Of Discerning Clients"
                              className="text-muted"
                            />
                          </Form.Group>
                          <Form.Group className="mb-0">
                            <Form.Label className="form-sub-label small">Text</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={6}
                              value={sec.text ?? ""}
                              onChange={(e) => onSectionField(slug, index, "text", e.target.value)}
                              placeholder="Plain text for this section…"
                              className="text-muted"
                            />
                          </Form.Group>
                        </div>
                      ))}

                      <Button
                        type="submit"
                        className="btn btn--theme mt-2"
                        disabled={savingSlug === slug}
                      >
                        <FaSave className="me-2" />
                        {savingSlug === slug ? "Saving…" : "Save"}
                      </Button>
                    </Form>
                  </Tab>
                );
              })}
            </Tabs>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

LegalPagesManagement.propTypes = {
  getLegalPages: PropTypes.func.isRequired,
  updateLegalPage: PropTypes.func.isRequired,
};

export default connect(null, { getLegalPages, updateLegalPage })(
  LegalPagesManagement,
);
