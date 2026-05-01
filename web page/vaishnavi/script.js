let data = [];
let selected = null;

d3.csv("churn_demographics.csv").then(d => {

    d.forEach(row => {
        row.tenure = +row.tenure;
        row.SeniorCitizen = +row.SeniorCitizen;
        row.Churn = row.Churn === "Yes" ? 1 : 0;
    });

    data = d;
    updateDashboard();

    d3.select("#seniorToggle").on("change", updateDashboard);
    d3.select("#nonToggle").on("change", updateDashboard);

    d3.select("#tenureSlider").on("input", function(){
        d3.select("#tenureValue").text(this.value);
        updateDashboard();
    });
});

function updateDashboard(){

    let seniorOn = d3.select("#seniorToggle").property("checked");
    let nonOn = d3.select("#nonToggle").property("checked");
    let maxTenure = +d3.select("#tenureSlider").property("value");

    let filtered = data.filter(d =>
        d.tenure <= maxTenure &&
        ((seniorOn && d.SeniorCitizen === 1) ||
         (nonOn && d.SeniorCitizen === 0))
    );

    let churnRate = d3.mean(filtered, d => d.Churn) || 0;
    let seniorData = filtered.filter(d=>d.SeniorCitizen===1);
    let nonData = filtered.filter(d=>d.SeniorCitizen===0);

    let seniorRate = seniorData.length ? d3.mean(seniorData, d=>d.Churn) : 0;
    let nonRate = nonData.length ? d3.mean(nonData, d=>d.Churn) : 0;
    
    d3.select("#total").text(data.length);
    d3.select("#sample").text(filtered.length);
    d3.select("#avg").text((churnRate*100).toFixed(1)+"%");
    d3.select("#risk").text(
        churnRate > 0.4 ? "High" :
        churnRate > 0.2 ? "Medium" : "Low"
    );
    d3.select("#diff").text((Math.abs(seniorRate-nonRate)*100).toFixed(1)+"%");

    d3.select("#quickInsight").text(
        seniorRate > nonRate
        ? "Senior customers show higher churn"
        : "Non-senior customers show higher churn"
    );

    d3.select("#insight").html(`
        <b>Key Observation</b><br><br>
        Churn rate is ${(churnRate*100).toFixed(1)}%.
        Clear variation exists between customer groups.
    `);

    d3.select("#conclusion").html(`
        <b>Business Suggestion</b><br><br>
        Focus retention strategies on higher-risk segments.
    `);

    drawChart([
        {group:"Senior", value: seniorRate},
        {group:"Non-Senior", value: nonRate}
    ]);
}

function drawChart(chartData){

    d3.select("#chart").html("");

    const width = 850;
    const height = 520;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleBand()
        .domain(chartData.map(d=>d.group))
        .range([120, width-60])
        .padding(0.4);

    const y = d3.scaleLinear()
        .domain([0,1])
        .range([height-90, 40]);

    const bars = svg.selectAll("rect")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("x",d=>x(d.group))
        .attr("width",x.bandwidth())
        .attr("y",height-90)
        .attr("height",0)
        .attr("fill",(d,i)=> i===0?"#dc2626":"#16a34a")
        .style("cursor","pointer")
        .on("mouseover", function(){ d3.select(this).attr("opacity",0.7); })
        .on("mouseout", function(){ d3.select(this).attr("opacity",1); })
        .on("click", function(event,d){
            selected = d;
            showDetails();
        });

    bars.transition()
        .duration(1000)
        .attr("y",d=>y(d.value))
        .attr("height",d=>height-90-y(d.value));

    svg.selectAll(".bar-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class","bar-label")
        .attr("x",d=>x(d.group)+x.bandwidth()/2)
        .attr("y",d=>y(d.value)-10)
        .attr("text-anchor","middle")
        .text(d => (d.value*100).toFixed(1)+"%")
        .style("fill","white")
        .style("pointer-events","none");

    svg.append("g")
        .attr("transform",`translate(0,${height-90})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform","translate(120,0)")
        .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .attr("text-anchor", "middle")
        .text("Customer Type")
        .style("fill", "white");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .text("Churn Rate")
        .style("fill", "white");

    const line = d3.line()
        .x(d => x(d.group)+x.bandwidth()/2)
        .y(d => y(d.value));

    svg.append("path")
        .datum(chartData)
        .attr("fill","none")
        .attr("stroke","#facc15")
        .attr("stroke-width",2)
        .attr("stroke-dasharray","5,5")
        .attr("d",line);
}

function showDetails(){

    d3.select(".kpis").style("display","none");
    d3.select("#mainView").style("display","none");
    d3.select("#detailView").style("display","block");

    d3.select("#detailTitle").text(selected.group + " Customers");

    d3.select("#detailTitle")
        .append("div")
        .style("font-size","14px")
        .style("color","#94a3b8")
        .style("margin-top","5px")
        .text("Detailed breakdown of churn vs retained customers");

    d3.select("#detailDesc").text((selected.value*100).toFixed(2) + "% Churn");

    d3.select("#detailInsight").text(
        selected.value > 0.4
        ? "This segment has a significantly higher churn rate, indicating lower engagement or dissatisfaction."
        : "This segment shows stable behavior with relatively low churn risk."
    );

    d3.select("#detailRecommendation").text(
        selected.value > 0.4
        ? "Introduce targeted retention strategies such as personalized offers and proactive engagement."
        : "Maintain current engagement strategies and monitor customer behavior."
    );

    drawMiniChart(selected.value);
}

//////////////////////////////////////////////////////
// 🔥 DONUT CHART (REPLACED SUB GRAPH)
//////////////////////////////////////////////////////

function drawMiniChart(value){

    if (value === undefined || isNaN(value)) value = 0;

    d3.select("#miniChart").html("");

    const width = 350;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select("#miniChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2}, ${height/2})`);

    const data = [
        {label:"Churn", value:value},
        {label:"Retained", value:1-value}
    ];

    const color = d3.scaleOrdinal()
        .domain(data.map(d=>d.label))
        .range(["#dc2626","#16a34a"]);

    const pie = d3.pie().value(d => d.value);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius);

    // 🔥 TOOLTIP
    const tooltip = d3.select("body")
        .append("div")
        .style("position","absolute")
        .style("background","#0b1a33")
        .style("padding","8px")
        .style("border-radius","6px")
        .style("color","white")
        .style("opacity",0);

    // 🔥 DONUT WITH ANIMATION
    svg.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("fill", d => color(d.data.label))
        .attr("stroke","#020617")
        .style("stroke-width","2px")
        .on("mouseover",(event,d)=>{
            tooltip.style("opacity",1)
                .html(`${d.data.label}: ${(d.data.value*100).toFixed(1)}%`);
        })
        .on("mousemove",(event)=>{
            tooltip.style("left",event.pageX+"px")
                   .style("top",event.pageY+"px");
        })
        .on("mouseout",()=>tooltip.style("opacity",0))
        .transition()
        .duration(1000)
        .attrTween("d", function(d){
            const i = d3.interpolate({startAngle:0,endAngle:0}, d);
            return t => arc(i(t));
        });

    // 🔥 CENTER ANIMATION
    svg.append("text")
        .attr("text-anchor","middle")
        .attr("dy","-5")
        .style("font-size","20px")
        .style("fill","#22c55e")
        .text("0%")
        .transition()
        .duration(1000)
        .tween("text", function(){
            const that = d3.select(this);
            const i = d3.interpolateNumber(0, value*100);
            return function(t){
                that.text(i(t).toFixed(1)+"%");
            };
        });

    svg.append("text")
        .attr("text-anchor","middle")
        .attr("dy","15")
        .style("font-size","12px")
        .style("fill","#94a3b8")
        .text("Churn");
}

function goBack(){
    d3.select(".kpis").style("display","grid");
    d3.select("#detailView").style("display","none");
    d3.select("#mainView").style("display","block");
}

function resetFilters(){
    d3.select("#seniorToggle").property("checked",true);
    d3.select("#nonToggle").property("checked",true);
    d3.select("#tenureSlider").property("value",72);
    d3.select("#tenureValue").text(72);
    updateDashboard();
}