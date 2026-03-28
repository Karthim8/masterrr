import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WordData } from '../services/ai';

interface SemanticGraphProps {
  data: WordData | null;
}

export default function SemanticGraph({ data }: SemanticGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    // Setup Zoom container
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
      
    svg.call(zoom);
    // Center initially
    svg.call(zoom.transform, d3.zoomIdentity.translate(width/8, height/8).scale(0.8));

    // Definitions for markers and shadows
    const defs = svg.append("defs");
    
    // Chunky game shadow
    const filter = defs.append("filter")
      .attr("id", "chunky-shadow")
      .attr("x", "-20%").attr("y", "-20%")
      .attr("width", "150%").attr("height", "150%");
    filter.append("feDropShadow")
      .attr("dx", "0").attr("dy", "6")
      .attr("stdDeviation", "0")
      .attr("flood-color", "#0f172a")
      .attr("flood-opacity", "0.2");

    // Arrow markers for links
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 34) 
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#cbd5e1");

    defs.append("marker")
      .attr("id", "arrow-highlight")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 34)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#a855f7");

    // Prepare nodes and links
    const nodes: any[] = [{ id: data.word, group: 1, radius: 50, fx: width / 2, fy: height / 2 }];
    const links: any[] = [];

    data.senses.forEach((sense, i) => {
      nodes.push({ id: sense.meaning, group: 2, radius: 40 });
      links.push({ source: data.word, target: sense.meaning });

      // Add correct word as a child of the sense
      nodes.push({ id: sense.correct, group: 3, radius: 30 });
      links.push({ source: sense.meaning, target: sense.correct });
    });

    // Create a map of connections for hover effects
    const linkedByIndex: Record<string, boolean> = {};
    links.forEach(d => {
      linkedByIndex[`${d.source},${d.target}`] = true;
    });

    function isConnected(a: any, b: any) {
      return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
    }

    // Radial layout for a "Skill Tree" look
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance((d: any) => d.target.group === 2 ? 160 : 120))
      .force("charge", d3.forceManyBody().strength(-1500))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 15).iterations(3))
      .force("radial", d3.forceRadial(
        (d: any) => d.group === 1 ? 0 : (d.group === 2 ? 180 : 340),
        width / 2,
        height / 2
      ).strength(1));

    // Draw links as straight thick lines
    const link = g.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 6)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)")
      .attr("class", "transition-all duration-300");

    // Draw nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => {
        if (d.group === 1) return "#a855f7"; // purple-500
        if (d.group === 2) return "#3b82f6"; // blue-500
        return "#10b981"; // emerald-500
      })
      .attr("stroke", (d: any) => {
        if (d.group === 1) return "#7e22ce"; // purple-700
        if (d.group === 2) return "#1d4ed8"; // blue-700
        return "#047857"; // emerald-700
      })
      .attr("stroke-width", 6)
      .style("filter", "url(#chunky-shadow)")
      .attr("cursor", "grab")
      .call(drag(simulation) as any);

    // Draw labels with text halo for readability
    const labelGroup = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("pointer-events", "none");

    // Halo (white stroke)
    labelGroup.append("text")
      .text((d: any) => d.id)
      .attr("font-size", (d: any) => d.group === 1 ? "22px" : "16px")
      .attr("font-weight", "900")
      .attr("font-family", "Outfit, sans-serif")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.radius + 24)
      .attr("stroke", "white")
      .attr("stroke-width", 8)
      .attr("stroke-linejoin", "round")
      .attr("fill", "none");

    // Actual text
    labelGroup.append("text")
      .text((d: any) => d.id)
      .attr("font-size", (d: any) => d.group === 1 ? "22px" : "16px")
      .attr("font-weight", "900")
      .attr("font-family", "Outfit, sans-serif")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.radius + 24)
      .attr("fill", "#334155");

    // Hover interactions
    node.on("mouseover", function(event, d: any) {
      // Dim unassociated nodes
      node.style("opacity", (o: any) => isConnected(d, o) ? 1 : 0.2);
      labelGroup.style("opacity", (o: any) => isConnected(d, o) ? 1 : 0.2);
      
      // Highlight connected links
      link
        .style("opacity", (o: any) => (o.source.id === d.id || o.target.id === d.id ? 1 : 0.2))
        .attr("stroke", (o: any) => (o.source.id === d.id || o.target.id === d.id ? "#a855f7" : "#cbd5e1"))
        .attr("stroke-width", (o: any) => (o.source.id === d.id || o.target.id === d.id ? 8 : 6))
        .attr("marker-end", (o: any) => (o.source.id === d.id || o.target.id === d.id ? "url(#arrow-highlight)" : "url(#arrow)"));
        
      d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 8);
    })
    .on("mouseout", function() {
      // Restore all
      node.style("opacity", 1)
        .attr("stroke", (d: any) => {
          if (d.group === 1) return "#7e22ce"; 
          if (d.group === 2) return "#1d4ed8"; 
          return "#047857"; 
        })
        .attr("stroke-width", 6);
      labelGroup.style("opacity", 1);
      link
        .style("opacity", 1)
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 6)
        .attr("marker-end", "url(#arrow)");
    });

    simulation.on("tick", () => {
      // Straight links
      link.attr("d", (d: any) => {
        return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
      });

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      labelGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        if (event.subject.group !== 1) {
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }
        d3.select(this).attr("cursor", "grabbing");
      }
      
      function dragged(event: any) {
        if (event.subject.group !== 1) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        if (event.subject.group !== 1) {
          event.subject.fx = null;
          event.subject.fy = null;
        }
        d3.select(this).attr("cursor", "grab");
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-bold">
        Generate a word to see its semantic web.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] relative bg-slate-50 overflow-hidden">
      {/* Dotted background pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#cbd5e1_2px,transparent_2px)] [background-size:32px_32px]"></div>
      
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="cursor-move" />
      
      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white px-5 py-4 rounded-2xl text-sm font-black text-slate-700 border-4 border-slate-200 border-b-[6px] transition-all hover:scale-105">
        <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-3">Skill Tree Legend</h4>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-5 h-5 rounded-full bg-purple-500 border-4 border-purple-700"></div> 
          <span>Root Word</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 border-4 border-blue-700"></div> 
          <span>Meaning / Sense</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-500 border-4 border-emerald-700"></div> 
          <span>Conjugated Form</span>
        </div>
      </div>
      
      {/* Controls Hint */}
      <div className="absolute top-6 right-6 bg-white px-4 py-2 rounded-xl text-xs font-black text-slate-500 border-4 border-slate-200 border-b-[6px] pointer-events-none">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  );
}
