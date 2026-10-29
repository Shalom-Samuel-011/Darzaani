class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        let queryObj = { ...this.queryString };
        const excludedFields = ["page", "sort", "limit", "fields", "search"];
        excludedFields.forEach((el) => delete queryObj[el]);

        const queryStr = JSON.stringify(queryObj);
        queryObj = JSON.parse(
            queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`),
        );

        this.query = this.query.find(queryObj);
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(",").join(" ");
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort("-createdAt");
        }
        return this;
    }

    fieldLimit() {
        if (this.queryString.fields) {
            const field = this.queryString.fields.split(",").join(" ");
            this.query = this.query.select(field);
            console.log(field);
        } else {
            this.query = this.query.select("-__v");
        }
        return this;
    }

    paginate() {
        const page = Math.max(Number.parseInt(this.queryString.page, 10) || 1, 1);
        const limit = Math.min(
            Math.max(Number.parseInt(this.queryString.limit, 10) || 10, 1),
            10,
        );
        const resSkipped = (page - 1) * limit;

        // if(this.queryString.page){
        //     const totalTours = await tourModel.countDocuments();      we don't actually need this error
        //     if(resSkipped >= totalTours){
        //         throw new Error('Page does not exist');
        //     }
        // }
        this.query = this.query.skip(resSkipped).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
