import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  return (
    <div className="page">
      <div className="card center">
        <h1>404</h1>
        <p>{t("common.notFound")}</p>
        <Link className="btn-primary" to={`/${locale}`}>
          {t("common.backHome")}
        </Link>
      </div>
    </div>
  );
}
