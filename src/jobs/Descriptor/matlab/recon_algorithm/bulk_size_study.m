%Find the best cut size according to VF

%Xiaolin Li
%Northwestern University
clear all;
load('./PBC_result/sample_binary_input_coarsen_recon.mat');
L = length(Bimg_coarse(1,1,:));
means = [];
stds = [];
units = [];
edge = 0;
size = L-2*edge;
    
    bulk = Bimg_coarse(edge+1:edge+size, edge+1:edge+size, edge+1:edge+size); % the central bulk selected
    for unit_l = 20:5:size
        vfs = [];
        unit_l
        for i = 1 : size-unit_l + 1
        	 for j = 1 : size-unit_l + 1
                for k = 1 : size-unit_l + 1
                    unit = bulk(i:i+unit_l-1, j:j+unit_l-1, k:k+unit_l-1);
                    vfs = [vfs sum(unit(:))/length(unit(1,1,:))^3];
                end
            end
        end
        
        units = [units unit_l];
        means = [means mean(vfs)];
        stds = [stds std(vfs)];
    end
    errorbar(units,means,stds,'k');
    xlabel('SVE size','FontSize',13)
    ylabel('VF','FontSize',13)
    title('The impacts of different bulk sizes on the VF');

