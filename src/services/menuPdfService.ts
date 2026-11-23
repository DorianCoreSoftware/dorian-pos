import {
  File,
  Paths,
} from 'expo-file-system';

import {
  Platform,
} from 'react-native';

import * as Sharing from 'expo-sharing';

import {
  BusinessSettings,
} from './businessHoursService';

import {
  getActiveCategories,
} from './categoryService';

import {
  getAllProducts,
} from './products';

import {
  getActiveProductModifierGroups,
} from './productModifierGroupService';

import {
  getAvailableModifiersByGroupId,
} from './modifierService';

import {
  getAvailableProductModifierOptions,
} from './productModifierOptionService';

import {
  getCategoryPersonalizationGroups,
} from './productCheckService';

import {
  formatCompactCurrency,
} from '../Utils/currency';

interface MenuPdfOptionGroup {
  name: string;
  options: string[];
}

interface MenuPdfProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  shortOptionGroups: MenuPdfOptionGroup[];
}

interface MenuPdfCategory {
  id: string;
  name: string;
  description: string;
  products: MenuPdfProduct[];
  sharedOptionGroups: MenuPdfOptionGroup[];
  defaultPersonalization: string[];
}

interface MenuPdfData {
  categories: MenuPdfCategory[];
}

interface PdfColor {
  r: number;
  g: number;
  b: number;
}

interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: PdfColor;
}

interface ProductOptionGroupSnapshot {
  name: string;
  options: string[];
  isExtra: boolean;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

const DEFAULT_BACKGROUND:
  PdfColor = {
    r: 0.04,
    g: 0.04,
    b: 0.04,
  };

const DEFAULT_PRIMARY:
  PdfColor = {
    r: 1,
    g: 0.76,
    b: 0,
  };

const WHITE:
  PdfColor = {
    r: 1,
    g: 1,
    b: 1,
  };

const MUTED:
  PdfColor = {
    r: 0.72,
    g: 0.72,
    b: 0.72,
  };

function normalizeHexColor(
  value:
    | string
    | null
    | undefined,
  fallback:
    PdfColor,
): PdfColor {
  const clean =
    value
      ?.trim()
      .replace(
        '#',
        '',
      ) ??
    '';

  if (
    !/^[0-9a-fA-F]{6}$/.test(
      clean,
    )
  ) {
    return fallback;
  }

  return {
    r:
      parseInt(
        clean.slice(
          0,
          2,
        ),
        16,
      ) / 255,

    g:
      parseInt(
        clean.slice(
          2,
          4,
        ),
        16,
      ) / 255,

    b:
      parseInt(
        clean.slice(
          4,
          6,
        ),
        16,
      ) / 255,
  };
}

function colorCommand(
  color:
    PdfColor,
): string {
  return `${color.r.toFixed(
    3,
  )} ${color.g.toFixed(
    3,
  )} ${color.b.toFixed(
    3,
  )} rg`;
}

function lineColorCommand(
  color:
    PdfColor,
): string {
  return `${color.r.toFixed(
    3,
  )} ${color.g.toFixed(
    3,
  )} ${color.b.toFixed(
    3,
  )} RG`;
}

function pdfEscape(
  value:
    string,
): string {
  return value
    .replace(
      /\\/g,
      '\\\\',
    )
    .replace(
      /\(/g,
      '\\(',
    )
    .replace(
      /\)/g,
      '\\)',
    );
}

function normalizePdfText(
  value:
    string,
): string {
  return value
    .replace(
      /[\u2018\u2019]/g,
      "'",
    )
    .replace(
      /[\u201C\u201D]/g,
      '"',
    )
    .replace(
      /[\u2013\u2014]/g,
      '-',
    )
    .replace(
      /\u2026/g,
      '...',
    )
    .replace(
      /[^\u0000-\u00FF]/g,
      '',
    );
}

function encodeLatin1(
  value:
    string,
): Uint8Array {
  const normalized =
    normalizePdfText(
      value,
    );

  const bytes =
    new Uint8Array(
      normalized.length,
    );

  for (
    let index = 0;
    index <
    normalized.length;
    index += 1
  ) {
    bytes[index] =
      normalized.charCodeAt(
        index,
      ) &
      0xff;
  }

  return bytes;
}

function concatBytes(
  chunks:
    Uint8Array[],
): Uint8Array {
  const length =
    chunks.reduce(
      (
        total,
        chunk,
      ) =>
        total +
        chunk.length,
      0,
    );

  const result =
    new Uint8Array(
      length,
    );

  let offset =
    0;

  chunks.forEach(
    chunk => {
      result.set(
        chunk,
        offset,
      );

      offset +=
        chunk.length;
    },
  );

  return result;
}

function wrapText(
  value:
    string,
  maxWidth:
    number,
  fontSize:
    number,
): string[] {
  const clean =
    value
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();

  if (!clean) {
    return [];
  }

  const approximateCharacterWidth =
    fontSize *
    0.52;

  const maxCharacters =
    Math.max(
      8,
      Math.floor(
        maxWidth /
        approximateCharacterWidth,
      ),
    );

  const words =
    clean.split(
      ' ',
    );

  const lines:
    string[] = [];

  let current =
    '';

  words.forEach(
    word => {
      const candidate =
        current
          ? `${current} ${word}`
          : word;

      if (
        candidate.length <=
        maxCharacters
      ) {
        current =
          candidate;

        return;
      }

      if (current) {
        lines.push(
          current,
        );
      }

      if (
        word.length <=
        maxCharacters
      ) {
        current =
          word;

        return;
      }

      let remaining =
        word;

      while (
        remaining.length >
        maxCharacters
      ) {
        lines.push(
          remaining.slice(
            0,
            maxCharacters,
          ),
        );

        remaining =
          remaining.slice(
            maxCharacters,
          );
      }

      current =
        remaining;
    },
  );

  if (current) {
    lines.push(
      current,
    );
  }

  return lines;
}

class PdfPageCanvas {
  private commands:
    string[] = [];

  constructor(
    private readonly primary:
      PdfColor,
    private readonly background:
      PdfColor,
  ) {
    this.fillRect(
      0,
      0,
      PAGE_WIDTH,
      PAGE_HEIGHT,
      background,
    );

    this.strokeRect(
      28,
      28,
      PAGE_WIDTH - 56,
      PAGE_HEIGHT - 56,
      primary,
      2.5,
    );
  }

  fillRect(
    x:
      number,
    y:
      number,
    width:
      number,
    height:
      number,
    color:
      PdfColor,
  ): void {
    this.commands.push(
      `${colorCommand(
        color,
      )} ${x.toFixed(
        2,
      )} ${y.toFixed(
        2,
      )} ${width.toFixed(
        2,
      )} ${height.toFixed(
        2,
      )} re f`,
    );
  }

  strokeRect(
    x:
      number,
    y:
      number,
    width:
      number,
    height:
      number,
    color:
      PdfColor,
    lineWidth:
      number,
  ): void {
    this.commands.push(
      `${lineColorCommand(
        color,
      )} ${lineWidth.toFixed(
        2,
      )} w ${x.toFixed(
        2,
      )} ${y.toFixed(
        2,
      )} ${width.toFixed(
        2,
      )} ${height.toFixed(
        2,
      )} re S`,
    );
  }

  line(
    x1:
      number,
    y1:
      number,
    x2:
      number,
    y2:
      number,
    color:
      PdfColor,
    lineWidth =
      1,
  ): void {
    this.commands.push(
      `${lineColorCommand(
        color,
      )} ${lineWidth.toFixed(
        2,
      )} w ${x1.toFixed(
        2,
      )} ${y1.toFixed(
        2,
      )} m ${x2.toFixed(
        2,
      )} ${y2.toFixed(
        2,
      )} l S`,
    );
  }

  text(
    value:
      string,
    x:
      number,
    y:
      number,
    options:
      TextOptions = {},
  ): void {
    const size =
      options.size ??
      11;

    const font =
      options.bold
        ? 'F2'
        : 'F1';

    const color =
      options.color ??
      WHITE;

    this.commands.push(
      `BT /${font} ${size.toFixed(
        2,
      )} Tf ${colorCommand(
        color,
      )} 1 0 0 1 ${x.toFixed(
        2,
      )} ${y.toFixed(
        2,
      )} Tm (${pdfEscape(
        normalizePdfText(
          value,
        ),
      )}) Tj ET`,
    );
  }

  getContent():
    string {
    return this.commands.join(
      '\n',
    );
  }
}

function buildPdfBytes(
  pageContents:
    string[],
): Uint8Array {
  const objectCount =
    4 +
    pageContents.length *
    2;

  const objects:
    Uint8Array[] =
    new Array(
      objectCount +
      1,
    );

  objects[1] =
    encodeLatin1(
      '<< /Type /Catalog /Pages 2 0 R >>',
    );

  const pageRefs =
    pageContents.map(
      (
        _,
        index,
      ) =>
        `${5 + index * 2} 0 R`,
    );

  objects[2] =
    encodeLatin1(
      `<< /Type /Pages /Count ${pageContents.length} /Kids [${pageRefs.join(
        ' ',
      )}] >>`,
    );

  objects[3] =
    encodeLatin1(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    );

  objects[4] =
    encodeLatin1(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );

  pageContents.forEach(
    (
      content,
      index,
    ) => {
      const pageObjectId =
        5 +
        index *
        2;

      const contentObjectId =
        pageObjectId +
        1;

      const contentBytes =
        encodeLatin1(
          content,
        );

      objects[pageObjectId] =
        encodeLatin1(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
        );

      objects[contentObjectId] =
        concatBytes([
          encodeLatin1(
            `<< /Length ${contentBytes.length} >>\nstream\n`,
          ),
          contentBytes,
          encodeLatin1(
            '\nendstream',
          ),
        ]);
    },
  );

  const header =
    encodeLatin1(
      '%PDF-1.4\n%\xA5\xA6\xA7\xA8\n',
    );

  const chunks:
    Uint8Array[] = [
      header,
    ];

  const offsets:
    number[] =
    new Array(
      objectCount +
      1,
    ).fill(
      0,
    );

  let currentOffset =
    header.length;

  for (
    let objectId = 1;
    objectId <=
    objectCount;
    objectId += 1
  ) {
    const prefix =
      encodeLatin1(
        `${objectId} 0 obj\n`,
      );

    const suffix =
      encodeLatin1(
        '\nendobj\n',
      );

    offsets[objectId] =
      currentOffset;

    chunks.push(
      prefix,
      objects[objectId],
      suffix,
    );

    currentOffset +=
      prefix.length +
      objects[objectId].length +
      suffix.length;
  }

  const xrefOffset =
    currentOffset;

  const xrefLines:
    string[] = [
      'xref',
      `0 ${objectCount + 1}`,
      '0000000000 65535 f ',
    ];

  for (
    let objectId = 1;
    objectId <=
    objectCount;
    objectId += 1
  ) {
    xrefLines.push(
      `${String(
        offsets[objectId],
      ).padStart(
        10,
        '0',
      )} 00000 n `,
    );
  }

  const trailer =
    [
      ...xrefLines,
      'trailer',
      `<< /Size ${objectCount + 1} /Root 1 0 R >>`,
      'startxref',
      String(
        xrefOffset,
      ),
      '%%EOF',
      '',
    ].join(
      '\n',
    );

  chunks.push(
    encodeLatin1(
      trailer,
    ),
  );

  return concatBytes(
    chunks,
  );
}

function estimateProductHeight(
  product:
    MenuPdfProduct,
  columnWidth:
    number,
): number {
  const descriptionLines =
    wrapText(
      product.description,
      columnWidth,
      9.5,
    ).slice(
      0,
      4,
    ).length;

  const optionLines =
    product.shortOptionGroups.reduce(
      (
        total,
        group,
      ) => {
        const text =
          `${group.name}: ${group.options.join(
            ', ',
          )}`;

        return (
          total +
          Math.min(
            2,
            wrapText(
              text,
              columnWidth,
              8.5,
            ).length,
          )
        );
      },
      0,
    );

  return (
    42 +
    descriptionLines *
    12 +
    optionLines *
    10
  );
}

function renderProduct(
  canvas:
    PdfPageCanvas,
  product:
    MenuPdfProduct,
  x:
    number,
  y:
    number,
  width:
    number,
  primary:
    PdfColor,
  currencyCode:
    string,
): number {
  const height =
    estimateProductHeight(
      product,
      width,
    );

  canvas.text(
    product.name,
    x,
    y,
    {
      size:
        12.5,
      bold:
        true,
      color:
        primary,
    },
  );

  const price =
    formatCompactCurrency(
      product.price,
      currencyCode,
    );

  const approximatePriceWidth =
    price.length *
    6.3;

  canvas.text(
    price,
    x +
      width -
      approximatePriceWidth,
    y,
    {
      size:
        11.5,
      bold:
        true,
      color:
        primary,
    },
  );

  canvas.line(
    x,
    y - 6,
    x +
      width,
    y - 6,
    {
      r: 0.24,
      g: 0.24,
      b: 0.24,
    },
    0.7,
  );

  let cursorY =
    y -
    20;

  const descriptionLines =
    wrapText(
      product.description,
      width,
      9.5,
    ).slice(
      0,
      4,
    );

  descriptionLines.forEach(
    line => {
      canvas.text(
        line,
        x,
        cursorY,
        {
          size:
            9.5,
          color:
            WHITE,
        },
      );

      cursorY -=
        12;
    },
  );

  product.shortOptionGroups.forEach(
    group => {
      const lines =
        wrapText(
          `${group.name}: ${group.options.join(
            ', ',
          )}`,
          width,
          8.5,
        ).slice(
          0,
          2,
        );

      lines.forEach(
        (
          line,
          lineIndex,
        ) => {
          canvas.text(
            line,
            x,
            cursorY,
            {
              size:
                8.5,
              bold:
                lineIndex ===
                0,
              color:
                MUTED,
            },
          );

          cursorY -=
            10;
        },
      );
    },
  );

  if (
    !product.isAvailable
  ) {
    canvas.text(
      'Disponible según existencia',
      x,
      cursorY,
      {
        size:
          8,
        color:
          MUTED,
      },
    );
  }

  return height;
}

function createCoverPage(
  business:
    BusinessSettings,
  primary:
    PdfColor,
  background:
    PdfColor,
): string {
  const canvas =
    new PdfPageCanvas(
      primary,
      background,
    );

  canvas.fillRect(
    48,
    48,
    PAGE_WIDTH - 96,
    PAGE_HEIGHT - 96,
    {
      r: 0.015,
      g: 0.015,
      b: 0.015,
    },
  );

  const businessName =
    business.identity
      .businessName
      .trim() ||
    'Dorian POS';

  const nameLines =
    wrapText(
      businessName.toUpperCase(),
      430,
      30,
    ).slice(
      0,
      3,
    );

  let y =
    560;

  nameLines.forEach(
    line => {
      canvas.text(
        line,
        82,
        y,
        {
          size:
            30,
          bold:
            true,
          color:
            primary,
        },
      );

      y -=
        38;
    },
  );

  canvas.text(
    'MENÚ',
    82,
    y - 32,
    {
      size:
        42,
      bold:
        true,
      color:
        WHITE,
    },
  );

  canvas.line(
    82,
    y - 52,
    300,
    y - 52,
    primary,
    4,
  );

  if (
    business.identity.phone
      .trim()
  ) {
    canvas.text(
      `Tel. ${business.identity.phone.trim()}`,
      82,
      130,
      {
        size:
          11,
        bold:
          true,
        color:
          primary,
      },
    );
  }

  if (
    business.identity.address
      .trim()
  ) {
    const addressLines =
      wrapText(
        business.identity.address,
        430,
        9.5,
      ).slice(
        0,
        3,
      );

    let addressY =
      112;

    addressLines.forEach(
      line => {
        canvas.text(
          line,
          82,
          addressY,
          {
            size:
              9.5,
            color:
              MUTED,
          },
        );

        addressY -=
          12;
      },
    );
  }

  canvas.text(
    'Precios y productos actualizados desde Dorian POS',
    82,
    72,
    {
      size:
        8.5,
      color:
        MUTED,
    },
  );

  return canvas.getContent();
}

function createCategoryPages(
  category:
    MenuPdfCategory,
  business:
    BusinessSettings,
  primary:
    PdfColor,
  background:
    PdfColor,
): string[] {
  const pages:
    string[] = [];

  const columnWidth =
    238;

  const leftX =
    58;

  const rightX =
    316;

  let canvas:
    PdfPageCanvas;

  let leftY:
    number;

  let rightY:
    number;

  let currentColumn:
    0 | 1;

  const beginPage =
    (
      continuation:
        boolean,
    ): void => {
      canvas =
        new PdfPageCanvas(
          primary,
          background,
        );

      canvas.text(
        category.name.toUpperCase(),
        58,
        725,
        {
          size:
            25,
          bold:
            true,
          color:
            primary,
        },
      );

      if (
        continuation
      ) {
        canvas.text(
          'CONTINUACIÓN',
          58,
          706,
          {
            size:
              8.5,
            bold:
              true,
            color:
              MUTED,
          },
        );
      } else if (
        category.description
      ) {
        const descriptionLines =
          wrapText(
            category.description,
            490,
            9.5,
          ).slice(
            0,
            2,
          );

        let descriptionY =
          704;

        descriptionLines.forEach(
          line => {
            canvas.text(
              line,
              58,
              descriptionY,
              {
                size:
                  9.5,
                color:
                  MUTED,
              },
            );

            descriptionY -=
              12;
          },
        );
      }

      canvas.line(
        58,
        688,
        554,
        688,
        primary,
        1.5,
      );

      leftY =
        662;

      rightY =
        662;

      currentColumn =
        0;
    };

  const finishPage =
    (): void => {
      const phone =
        business.identity.phone
          .trim();

      if (phone) {
        canvas.text(
          phone,
          58,
          49,
          {
            size:
              8,
            color:
              MUTED,
          },
        );
      }

      canvas.text(
        business.identity
          .businessName,
        554 -
          Math.min(
            240,
            business.identity
              .businessName
              .length *
              4.5,
          ),
        49,
        {
          size:
            8,
          bold:
            true,
          color:
            primary,
        },
      );

      pages.push(
        canvas.getContent(),
      );
    };

  beginPage(
    false,
  );

  category.products.forEach(
    product => {
      const height =
        estimateProductHeight(
          product,
          columnWidth,
        );

      let y =
        currentColumn ===
        0
          ? leftY
          : rightY;

      if (
        y -
        height <
        112
      ) {
        if (
          currentColumn ===
          0
        ) {
          currentColumn =
            1;

          y =
            rightY;
        } else {
          finishPage();

          beginPage(
            true,
          );

          y =
            leftY;
        }
      }

      const x =
        currentColumn ===
        0
          ? leftX
          : rightX;

      const usedHeight =
        renderProduct(
          canvas,
          product,
          x,
          y,
          columnWidth,
          primary,
          business.identity
            .currencyCode,
        );

      if (
        currentColumn ===
        0
      ) {
        leftY -=
          usedHeight;
      } else {
        rightY -=
          usedHeight;
      }
    },
  );

  const sharedBlocks:
    Array<{
      title:
        string;
      lines:
        string[];
    }> = [];

  category.sharedOptionGroups.forEach(
    group => {
      sharedBlocks.push({
        title:
          group.name,
        lines:
          wrapText(
            group.options.join(
              ' · ',
            ),
            columnWidth,
            9,
          ),
      });
    },
  );

  if (
    category.defaultPersonalization
      .length >
    0
  ) {
    sharedBlocks.push({
      title:
        'Personalización incluida',
      lines:
        wrapText(
          category.defaultPersonalization.join(
            ' · ',
          ),
          columnWidth,
          9,
        ),
    });
  }

  sharedBlocks.forEach(
    block => {
      const height =
        34 +
        block.lines.length *
        11;

      let y =
        currentColumn ===
        0
          ? leftY
          : rightY;

      if (
        y -
        height <
        112
      ) {
        if (
          currentColumn ===
          0
        ) {
          currentColumn =
            1;

          y =
            rightY;
        } else {
          finishPage();

          beginPage(
            true,
          );

          y =
            leftY;
        }
      }

      const x =
        currentColumn ===
        0
          ? leftX
          : rightX;

      canvas.fillRect(
        x,
        y -
          height +
          8,
        columnWidth,
        height,
        {
          r: 0.09,
          g: 0.09,
          b: 0.09,
        },
      );

      canvas.strokeRect(
        x,
        y -
          height +
          8,
        columnWidth,
        height,
        primary,
        0.8,
      );

      canvas.text(
        block.title.toUpperCase(),
        x + 10,
        y - 10,
        {
          size:
            10.5,
          bold:
            true,
          color:
            primary,
        },
      );

      let lineY =
        y - 26;

      block.lines.forEach(
        line => {
          canvas.text(
            line,
            x + 10,
            lineY,
            {
              size:
                9,
              color:
                WHITE,
            },
          );

          lineY -=
            11;
        },
      );

      if (
        currentColumn ===
        0
      ) {
        leftY -=
          height +
          8;
      } else {
        rightY -=
          height +
          8;
      }
    },
  );

  finishPage();

  return pages;
}

async function getProductOptionGroups(
  productId:
    string,
): Promise<
  ProductOptionGroupSnapshot[]
> {
  try {
    const [
      associations,
      productOptions,
    ] =
      await Promise.all([
        getActiveProductModifierGroups(
          productId,
        ),
        getAvailableProductModifierOptions(
          productId,
        ),
      ]);

    const allowedIds =
      new Set(
        productOptions.map(
          option =>
            option.modifierId,
        ),
      );

    return (
      await Promise.all(
        associations.map(
          async association => {
            const group =
              association.group as
                | {
                  id:
                    string;
                  name:
                    string;
                  code:
                    string;
                  kind?:
                    string;
                }
                | null
                | undefined;

            if (!group) {
              return null;
            }

            const modifiers =
              await getAvailableModifiersByGroupId(
                association.modifierGroupId,
              );

            const filteredModifiers =
              allowedIds.size >
              0
                ? modifiers.filter(
                    modifier =>
                      allowedIds.has(
                        modifier.id,
                      ),
                  )
                : modifiers;

            const options =
              Array.from(
                new Set(
                  filteredModifiers
                    .map(
                      modifier =>
                        modifier.name
                          .trim(),
                    )
                    .filter(
                      Boolean,
                    ),
                ),
              );

            if (
              options.length ===
              0
            ) {
              return null;
            }

            return {
              name:
                group.name,
              options,
              isExtra:
                group.kind ===
                'extra' ||
                group.code ===
                'billable_extras',
            } as ProductOptionGroupSnapshot;
          },
        ),
      )
    ).filter(
      (
        group,
      ): group is ProductOptionGroupSnapshot =>
        group !==
        null,
    );
  } catch (
  error
  ) {
    console.warn(
      'No se pudieron cargar opciones para el menú PDF:',
      error,
    );

    return [];
  }
}

function optionSignature(
  group:
    ProductOptionGroupSnapshot,
): string {
  return `${group.name.trim().toLocaleLowerCase(
    'es',
  )}|${[
    ...group.options,
  ].sort(
    (
      left,
      right,
    ) =>
      left.localeCompare(
        right,
        'es',
      ),
  ).join(
    '|',
  )}`;
}

async function loadMenuPdfData():
  Promise<MenuPdfData> {
  const [
    categories,
    allProducts,
  ] =
    await Promise.all([
      getActiveCategories(),
      getAllProducts(),
    ]);

  const activeCategories =
    categories.filter(
      category =>
        category.is_active ===
        true,
    );

  const activeCategoryIds =
    new Set(
      activeCategories.map(
        category =>
          category.id,
      ),
    );

  const activeProducts =
    allProducts.filter(
      product =>
        product.is_active ===
          true &&
        activeCategoryIds.has(
          product.category_id,
        ),
    );

  const productOptionEntries =
    await Promise.all(
      activeProducts.map(
        async product => ({
          productId:
            product.id,
          groups:
            await getProductOptionGroups(
              product.id,
            ),
        }),
      ),
    );

  const groupsByProductId =
    new Map(
      productOptionEntries.map(
        entry => [
          entry.productId,
          entry.groups,
        ],
      ),
    );

  const menuCategories =
    await Promise.all(
      activeCategories.map(
        async category => {
          const categoryProducts =
            activeProducts
              .filter(
                product =>
                  product.category_id ===
                  category.id,
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  left.name.localeCompare(
                    right.name,
                    'es',
                    {
                      sensitivity:
                        'base',
                    },
                  ),
              );

          const groupOccurrences =
            new Map<
              string,
              {
                group:
                  ProductOptionGroupSnapshot;
                productIds:
                  Set<string>;
              }
            >();

          categoryProducts.forEach(
            product => {
              (
                groupsByProductId.get(
                  product.id,
                ) ??
                []
              )
                .filter(
                  group =>
                    !group.isExtra,
                )
                .forEach(
                  group => {
                    const signature =
                      optionSignature(
                        group,
                      );

                    const existing =
                      groupOccurrences.get(
                        signature,
                      ) ?? {
                        group,
                        productIds:
                          new Set<string>(),
                      };

                    existing.productIds.add(
                      product.id,
                    );

                    groupOccurrences.set(
                      signature,
                      existing,
                    );
                  },
                );
            },
          );

          const sharedSignatures =
            new Set(
              Array.from(
                groupOccurrences.entries(),
              )
                .filter(
                  (
                    [
                      ,
                      occurrence,
                    ],
                  ) =>
                    occurrence.productIds
                      .size >=
                      2 ||
                    occurrence.group
                      .options.length >
                      6,
                )
                .map(
                  (
                    [
                      signature,
                    ],
                  ) =>
                    signature,
                ),
            );

          let defaultPersonalization:
            string[] = [];

          try {
            const personalizationGroups =
              await getCategoryPersonalizationGroups(
                category.id,
              );

            defaultPersonalization =
              personalizationGroups
                .flatMap(
                  group =>
                    group.options
                      .filter(
                        option =>
                          option.defaultSelected,
                      )
                      .map(
                        option =>
                          `${group.group.name}: ${option.name}`,
                      ),
                );
          } catch (
          error
          ) {
            console.warn(
              'No se pudo cargar la personalización para el menú PDF:',
              error,
            );
          }

          const products:
            MenuPdfProduct[] =
            categoryProducts.map(
              product => ({
                id:
                  product.id,

                name:
                  product.name,

                description:
                  product.description
                    ?.trim() ??
                  '',

                price:
                  Number(
                    product.price,
                  ),

                isAvailable:
                  product.is_available ===
                  true,

                shortOptionGroups:
                  (
                    groupsByProductId.get(
                      product.id,
                    ) ??
                    []
                  )
                    .filter(
                      group =>
                        !group.isExtra &&
                        !sharedSignatures.has(
                          optionSignature(
                            group,
                          ),
                        ),
                    )
                    .map(
                      group => ({
                        name:
                          group.name,
                        options:
                          group.options,
                      }),
                    ),
              }),
            );

          const sharedOptionGroups =
            Array.from(
              groupOccurrences.entries(),
            )
              .filter(
                (
                  [
                    signature,
                  ],
                ) =>
                  sharedSignatures.has(
                    signature,
                  ),
              )
              .map(
                (
                  [
                    ,
                    occurrence,
                  ],
                ) => ({
                  name:
                    occurrence.group
                      .name,
                  options:
                    occurrence.group
                      .options,
                }),
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  left.name.localeCompare(
                    right.name,
                    'es',
                  ),
              );

          return {
            id:
              category.id,
            name:
              category.name,
            description:
              category.description
                ?.trim() ??
              '',
            products,
            sharedOptionGroups,
            defaultPersonalization,
          } as MenuPdfCategory;
        },
      ),
    );

  return {
    categories:
      menuCategories.filter(
        category =>
          activeCategoryIds.has(
            category.id,
          ) &&
          category.products.length >
          0,
      ),
  };
}

function createPdfFileName(
  business:
    BusinessSettings,
): string {
  const safeBusinessName =
    (
      business.identity
        .shortName ||
      business.identity
        .businessName ||
      'menu'
    )
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '-',
      )
      .replace(
        /^-+|-+$/g,
        '' )
      .toLowerCase() ||
    'menu';

  return `${safeBusinessName}-menu.pdf`;
}

export async function generateMenuPdfBytes(
  business:
    BusinessSettings,
): Promise<
  Uint8Array
> {
  const menu =
    await loadMenuPdfData();

  if (
    menu.categories.length ===
    0
  ) {
    throw new Error(
      'No hay productos activos para generar el menú.',
    );
  }

  const primary =
    normalizeHexColor(
      business.identity
        .primaryColor,
      DEFAULT_PRIMARY,
    );

  const background =
    normalizeHexColor(
      business.identity
        .secondaryColor,
      DEFAULT_BACKGROUND,
    );

  const pages:
    string[] = [
      createCoverPage(
        business,
        primary,
        background,
      ),
    ];

  menu.categories.forEach(
    category => {
      pages.push(
        ...createCategoryPages(
          category,
          business,
          primary,
          background,
        ),
      );
    },
  );

  return buildPdfBytes(
    pages,
  );
}

function bytesToBlobPart(
  bytes:
    Uint8Array,
): ArrayBuffer {
  const copy =
    new Uint8Array(
      bytes.length,
    );

  copy.set(
    bytes,
  );

  return copy.buffer;
}

function downloadBytesOnWeb(
  bytes:
    Uint8Array,
  fileName:
    string,
): void {
  if (
    typeof document ===
      'undefined' ||
    typeof URL ===
      'undefined'
  ) {
    throw new Error(
      'La descarga web no está disponible.',
    );
  }

  const blob =
    new Blob(
      [
        bytesToBlobPart(
          bytes,
        ),
      ],
      {
        type:
          'application/pdf',
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      'a',
    );

  anchor.href =
    url;

  anchor.download =
    fileName;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url,
      ),
    1500,
  );
}

function previewBytesOnWeb(
  bytes:
    Uint8Array,
): void {
  if (
    typeof window ===
      'undefined' ||
    typeof URL ===
      'undefined'
  ) {
    throw new Error(
      'La vista previa web no está disponible.',
    );
  }

  const blob =
    new Blob(
      [
        bytesToBlobPart(
          bytes,
        ),
      ],
      {
        type:
          'application/pdf',
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const previewWindow =
    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );

  if (!previewWindow) {
    URL.revokeObjectURL(
      url,
    );

    throw new Error(
      'El navegador bloqueó la vista previa. Permite ventanas emergentes para este sitio.',
    );
  }

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url,
      ),
    60000,
  );
}

async function writeNativePdf(
  bytes:
    Uint8Array,
  fileName:
    string,
): Promise<
  File
> {
  const file =
    new File(
      Paths.cache,
      `${Date.now()}-${fileName}`,
    );

  await file.write(
    bytes,
  );

  return file;
}

export async function downloadMenuPdf(
  business:
    BusinessSettings,
): Promise<void> {
  const bytes =
    await generateMenuPdfBytes(
      business,
    );

  const fileName =
    createPdfFileName(
      business,
    );

  if (
    Platform.OS ===
    'web'
  ) {
    downloadBytesOnWeb(
      bytes,
      fileName,
    );

    return;
  }

  const file =
    await writeNativePdf(
      bytes,
      fileName,
    );

  if (
    await Sharing.isAvailableAsync()
  ) {
    await Sharing.shareAsync(
      file.uri,
      {
        dialogTitle:
          'Guardar o compartir menú PDF',

        mimeType:
          'application/pdf',
      },
    );

    return;
  }

  throw new Error(
    'No hay una aplicación disponible para guardar o compartir el PDF en este dispositivo.',
  );
}

export async function previewMenuPdf(
  business:
    BusinessSettings,
): Promise<void> {
  const bytes =
    await generateMenuPdfBytes(
      business,
    );

  if (
    Platform.OS ===
    'web'
  ) {
    previewBytesOnWeb(
      bytes,
    );

    return;
  }

  const file =
    await writeNativePdf(
      bytes,
      createPdfFileName(
        business,
      ),
    );

  if (
    await Sharing.isAvailableAsync()
  ) {
    await Sharing.shareAsync(
      file.uri,
      {
        dialogTitle:
          'Vista previa del menú PDF',

        mimeType:
          'application/pdf',
      },
    );

    return;
  }

  throw new Error(
    'No hay una aplicación disponible para abrir o compartir el PDF en este dispositivo.',
  );
}
