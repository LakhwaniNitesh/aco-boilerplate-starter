const ProductViewBaseFields = `
  fragment ProductViewBaseFields on ProductView {
    __typename
    id
    externalId
    sku
    name
    description
    shortDescription
    url
    urlKey
    inStock
    metaTitle
    metaKeyword
    metaDescription
    addToCartAllowed
  }
`;

const ProductViewImageFields = `
  fragment ProductViewImageFields on ProductViewImage {
    url
    label
    roles
  }
`;

const ProductViewAttributeFields = `
  fragment ProductViewAttributeFields on ProductViewAttribute {
    name
    label
    value
    roles
  }
`;

const ProductViewPriceFields = `
  fragment ProductViewPriceFields on ProductViewPrice {
    roles
    regular {
      amount {
        currency
        value
      }
    }
    final {
      amount {
        currency
        value
      }
    }
  }
`;

const ProductViewPriceRangeFields = `
  fragment ProductViewPriceRangeFields on ProductViewPriceRange {
    minimum {
      ...ProductViewPriceFields
    }
    maximum {
      ...ProductViewPriceFields
    }
  }
`;

const ProductViewOptionFields = `
  fragment ProductViewOptionFields on ProductViewOption {
    id
    title
    multi
    required
    values {
      ...ProductViewOptionValueFields
    }
  }
`;

const ProductViewOptionValueFields = `
  fragment ProductViewOptionValueFields on ProductViewOptionValue {
    id
    title
    inStock
    ... on ProductViewOptionValueSwatch {
      type
      value
      title
    }
    ... on ProductViewOptionValueConfiguration {
      title
    }
    ... on ProductViewOptionValueProduct {
      product {
        sku
        name
      }
    }
  }
`;

export {
  ProductViewAttributeFields,
  ProductViewBaseFields,
  ProductViewImageFields,
  ProductViewOptionFields,
  ProductViewOptionValueFields,
  ProductViewPriceFields,
  ProductViewPriceRangeFields,
};
