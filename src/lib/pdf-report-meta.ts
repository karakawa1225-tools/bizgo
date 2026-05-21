/** PDF 帳票ヘッダー（.env の NEXT_PUBLIC_BIZGO_PDF_COMPANY_NAME で上書き可） */
export const PDF_APPLICANT_NAME = "荒川　健一";

export const PDF_COMPANY_NAME =
  process.env.NEXT_PUBLIC_BIZGO_PDF_COMPANY_NAME?.trim() ||
  "株式会社アラカワ";
