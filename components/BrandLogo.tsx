import React from "react";
import ciidegLogo from "../logo/logo ciideg blanco.png";

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  logoUrl?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  imgClassName = "",
  logoUrl,
}) => (
  <div className={`inline-flex items-center ${className}`}>
    <img
      src={logoUrl || ciidegLogo}
      alt="Campus Virtual Logo"
      className={`h-auto w-full object-contain ${imgClassName}`}
    />
  </div>
);

export default BrandLogo;
