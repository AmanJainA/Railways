import React from "react";

const DashboardCard = ({
  title,
  count,
  color,
  bgColor,
  icon,
}) => {
  return (
    <div className="col-md-4">
      <div className="nr-cat-card">
        <div className="d-flex justify-content-between align-items-start">
          
          {/* Left Icon */}
          <div className={`cat-icon ${bgColor}`}>
            <i className={`ki-duotone ${icon} fs-2 text-${color}`}>
              <span className="path1"></span>
              <span className="path2"></span>
              <span className="path3"></span>
            </i>
          </div>

          {/* Arrow Icon */}
          <span className={`text-${color}`}>
            <i className="ki-duotone ki-arrow-up-right fs-5">
              <span className="path1"></span>
              <span className="path2"></span>
            </i>
          </span>
        </div>

        {/* Count */}
        <span className="cat-count mt-3 me-1">
          {count || 0}
        </span>

        {/* Title */}
        <span className="cat-name">
          {title}
        </span>
      </div>
    </div>
  );
};

export default DashboardCard;